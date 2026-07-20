"""
rag_service.py — Hybrid PDF extraction + RAG pipeline
======================================================

Extraction strategy (page-level hybrid):
1. PyMuPDF  → fast C-backed native text extraction for every page
2. PaddleOCR → deep-learning OCR only for pages where PyMuPDF yields
                fewer than MIN_TEXT_CHARS chars (scanned / image pages)

Performance optimisations for large (1000-page) PDFs:
• PyMuPDF processes text at ~100 pages/second (vs PyPDFLoader ~10 p/s)
• PaddleOCR is warmed up ONCE at module load — zero cold-start per upload
• Scanned pages are OCR'd in parallel (ThreadPoolExecutor)
• Embeddings are computed in a single batch (sentence-transformers batch_size=64)
• ChromaDB insertion is a single bulk transaction (collection.add)
• In-memory + disk hash cache means re-uploads skip processing entirely
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import fitz  # PyMuPDF
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model

from .agent_service import model as _online_model  # noqa: F401
from ..config import Config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Pages with fewer than this many meaningful characters are treated as scanned
MIN_TEXT_CHARS = 50

# Max parallel threads for OCR (keep reasonable to avoid memory pressure)
OCR_WORKERS = 4

# Sentence-transformer batch size for embedding
# all-MiniLM-L6-v2 is lightweight: 128 fits comfortably in CPU RAM
EMBED_BATCH_SIZE = 128

# Sub-batch size for chunked embedding (fires progress_cb per sub-batch)
# Keeps the progress bar moving on large PDFs instead of hanging at 60%
EMBED_SUB_BATCH = 512

# ChromaDB persistence directory
CHROMA_PERSIST_DIR = "./chroma_pdf_db"

# Similarity threshold
MAX_L2_DISTANCE = 1.2

# ---------------------------------------------------------------------------
# LLM for PDF chat — Perplexity Sonar
# We combat Sonar's web-search tendency by:
#   1. Injecting _DOC_GROUNDING at the top of every system prompt
#   2. Rewriting the user message to anchor it to the uploaded PDF
#   3. Providing all relevant chunks inside the system prompt
# ---------------------------------------------------------------------------
_rag_model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY,
)

# ---------------------------------------------------------------------------
# Embedding model — loaded ONCE at module level
# ---------------------------------------------------------------------------
#
# Model choice: all-MiniLM-L6-v2  vs  all-mpnet-base-v2
# ┌─────────────────────────┬─────────────┬────────┬──────────────────────┐
# │ Model                   │ Parameters  │  Dims  │  CPU speed (2800 ch) │
# ├─────────────────────────┼─────────────┼────────┼──────────────────────┤
# │ all-mpnet-base-v2       │  110 M      │  768   │  ~10-15 min          │
# │ all-MiniLM-L6-v2   ✓   │   22 M      │  384   │  ~1-2  min  (5x)     │
# └─────────────────────────┴─────────────┴────────┴──────────────────────┘
# Quality difference for retrieval: negligible (<2% on MTEB benchmarks).
#
# ⚠  If you have existing ChromaDB collections built with all-mpnet-base-v2
#    (768-dim), delete ./chroma_pdf_db and re-upload your PDFs.
# ---------------------------------------------------------------------------

# Maximise CPU threads for PyTorch (used by sentence-transformers)
try:
    import torch, os as _os
    _n_threads = int(_os.environ.get('OMP_NUM_THREADS', _os.cpu_count() or 4))
    torch.set_num_threads(_n_threads)
    logger.info(f"[EMBED] PyTorch CPU threads: {_n_threads}")
except Exception:
    pass

_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

_embeddings = HuggingFaceEmbeddings(
    model_name=_EMBED_MODEL,
    model_kwargs={"local_files_only": True},   # model already cached — no network calls
    encode_kwargs={"batch_size": EMBED_BATCH_SIZE, "normalize_embeddings": True},
)

# Raw sentence-transformers model reference (for bulk precompute)
_st_model = _embeddings._client  # SentenceTransformer instance

# ---------------------------------------------------------------------------
# PaddleOCR — warmed up ONCE (downloads ~18 MB models on first use)
# ---------------------------------------------------------------------------
_paddle_ocr = None  # lazy-initialised on first scanned page


def _get_paddle_ocr():
    """
    Return the singleton PaddleOCR instance.
    Uses only lang='en' — valid across PaddleOCR 2.x and 3.x.
    """
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            # Skip slow connectivity check (PaddleOCR 3.x feature, ignored in 2.x)
            os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

            from paddleocr import PaddleOCR
            import paddleocr as _poc
            ver = getattr(_poc, "__version__", "unknown")
            logger.info(f"[OCR] Initialising PaddleOCR {ver}…")

            # Use only lang= which is valid in ALL PaddleOCR versions (2.x and 3.x)
            _paddle_ocr = PaddleOCR(lang="en")
            logger.info("[OCR] PaddleOCR ready.")
        except ImportError:
            logger.warning("[OCR] paddleocr not installed — scanned pages will be skipped.")
        except Exception as exc:
            logger.error(f"[OCR] PaddleOCR init failed: {exc} — scanned pages will be skipped.")
    return _paddle_ocr



# ---------------------------------------------------------------------------
# In-memory caches
# ---------------------------------------------------------------------------
_cached_vector_stores: dict[str, Chroma] = {}
_conversation_history: dict[str, list] = {}
_session_threads: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Conversation-aware turn router
# ---------------------------------------------------------------------------

_TURN_ROUTER_PROMPT = """\
You are looking at a conversation between a user and a PDF study assistant.
Decide what the user's latest message wants:

A. REFORMAT — the message asks you to transform, filter, shorten, reformat,
   or extract part of your OWN PREVIOUS ANSWER (e.g. "just give me the names",
   "make it shorter", "put that in a table", "remove the descriptions",
   "give me only the topic name", "list only the headings"). It does NOT
   need new information from the document.

B. STANDALONE — the message is a new, fully self-contained question that
   does not depend on anything said earlier.

C. FOLLOWUP — the message depends on earlier context to be understood (uses
   "it", "that", "the second one", assumes a subject mentioned earlier, etc.)
   but IS asking for new information, not a reformat of the last answer.

Conversation so far:
{history_text}

Latest user message: {query}

Respond with EXACTLY one of these formats, nothing else:
- "STANDALONE" — if (B)
- "REWRITE: <standalone version of the question>" — if (C)
- "REFORMAT: <the fully transformed answer, applying the user's instruction to your previous answer above>" — if (A)
"""


def route_turn(thread_id: str, query: str) -> tuple[str, str]:
    """
    Classify the current turn using the LLM and return (mode, payload).

    Returns:
      ("standalone", query)        — use query as-is for retrieval
      ("rewrite",   rewritten_q)  — use rewritten standalone query for retrieval
      ("reformat",  final_answer) — skip retrieval; payload IS the answer

    Falls back to ("standalone", query) on any error, or when there is no
    history yet (nothing to route against).
    """
    history = _conversation_history.get(thread_id, [])
    if not history:
        return "standalone", query

    recent = history[-6:]
    history_text = "\n".join(
        f"{msg['role'].upper()}: {msg['content'][:500]}" for msg in recent
    )

    try:
        prompt_messages = [
            {"role": "system", "content": "You are a precise conversation router. Follow the response format exactly."},
            {"role": "user", "content": _TURN_ROUTER_PROMPT.format(
                history_text=history_text, query=query
            )},
        ]
        response = _rag_model.invoke(prompt_messages)
        raw = (response.content if hasattr(response, "content") else str(response)).strip()

        upper = raw.upper()
        if upper.startswith("REFORMAT:"):
            payload = raw.split(":", 1)[1].strip()
            logger.info(f"[ROUTE] REFORMAT turn for '{query}'")
            return "reformat", payload
        if upper.startswith("REWRITE:"):
            rewritten = raw.split(":", 1)[1].strip()
            if rewritten:
                logger.info(f"[ROUTE] REWRITE '{query}' → '{rewritten}'")
                return "rewrite", rewritten
        # STANDALONE or unrecognised
        logger.info(f"[ROUTE] STANDALONE turn for '{query}'")
        return "standalone", query
    except Exception as exc:
        logger.warning(f"[ROUTE] Turn routing failed, defaulting to standalone: {exc}")
        return "standalone", query


def answer_question(vector_store, thread_id: str, query: str) -> str:
    """
    Full pipeline for one PDF-chat turn.
    This is the ONLY function routes/pdf_chat.py should call for asking a question.

    Flow:
      1. route_turn() classifies the turn (STANDALONE / REWRITE / REFORMAT).
      2. REFORMAT → return the transformed answer immediately, no retrieval.
      3. REWRITE   → use the rewritten query for retrieval.
      4. STANDALONE → use the original query for retrieval.
      5. retrieve_context + build_answer as before.
    """
    mode, payload = route_turn(thread_id, query)

    if mode == "reformat":
        # No retrieval needed — record the turn and return the transformed answer
        history = _conversation_history.get(thread_id, [])
        _conversation_history[thread_id] = history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": payload},
        ]
        return payload

    effective_query = payload  # either the rewritten standalone or the original
    context, source_docs, relevance_score = retrieve_context(
        vector_store, effective_query
    )
    return build_answer(
        thread_id=thread_id,
        context=context,
        query=effective_query,
        source_docs=source_docs,
        relevance_score=relevance_score,
        display_query=query,   # always store the original user message in history
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def _is_text_page(text: str) -> bool:
    """Return True if the page has enough real text (not a scanned image)."""
    # Strip whitespace and common PDF artefacts before counting
    clean = re.sub(r"\s+", "", text)
    return len(clean) >= MIN_TEXT_CHARS


def _ocr_page(page_index: int, page_pixmap_bytes: bytes) -> tuple[int, str]:
    """
    Run PaddleOCR on a single rendered page image (bytes).
    Handles both PaddleOCR 2.x and 3.x return formats.
    Returns (page_index, extracted_text).
    Called from a thread pool.
    """
    ocr = _get_paddle_ocr()
    if ocr is None:
        return page_index, ""
    try:
        import numpy as np
        import cv2

        # Decode the PNG bytes → numpy array for PaddleOCR
        nparr = np.frombuffer(page_pixmap_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return page_index, ""

        # Call without cls= (valid in both 2.x and 3.x)
        result = ocr.ocr(img)

        if not result:
            return page_index, ""

        lines = []

        # Handle both return formats:
        # PaddleOCR 2.x: list[list[list[box, (text, score)]]]  → result[0] is the page
        # PaddleOCR 3.x: same outer structure or flat list
        page_result = result[0] if (result and isinstance(result[0], list)) else result

        if not page_result:
            return page_index, ""

        for item in page_result:
            try:
                # Standard 2.x format: [box_coords, (text, confidence)]
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    text_info = item[1]
                    if isinstance(text_info, (list, tuple)) and len(text_info) >= 1:
                        lines.append(str(text_info[0]))
                    elif isinstance(text_info, str):
                        lines.append(text_info)
                elif isinstance(item, str):
                    lines.append(item)
            except Exception:
                continue

        return page_index, "\n".join(lines)
    except Exception as exc:
        logger.warning(f"[OCR] Page {page_index} OCR failed: {exc}")
        return page_index, ""



# ---------------------------------------------------------------------------
# Core extraction: hybrid PyMuPDF + PaddleOCR
# ---------------------------------------------------------------------------

def _extract_text_hybrid(pdf_path: str) -> list[tuple[int, str]]:
    """
    Extract text from every page of the PDF using a two-pass hybrid strategy:

    Pass 1 (fast, C-backed):
        PyMuPDF extracts native text from all pages simultaneously.

    Pass 2 (parallel OCR — only for scanned pages):
        Pages that fail the text threshold are rendered to PNG and passed to
        PaddleOCR in a ThreadPoolExecutor.

    Returns a list of (page_number_1indexed, text) tuples.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    logger.info(f"[EXTRACT] PyMuPDF opened PDF: {total_pages} pages")

    # Pass 1 — native text extraction (very fast)
    page_texts: list[tuple[int, str]] = []
    scanned_pages: list[tuple[int, bytes]] = []  # (page_index, png_bytes)

    for page_idx in range(total_pages):
        page = doc[page_idx]
        text = page.get_text("text")  # fast native extraction

        if _is_text_page(text):
            page_texts.append((page_idx + 1, text))
        else:
            # Render page to PNG for OCR
            # Resolution: 150 DPI is a good speed/accuracy balance
            mat = fitz.Matrix(150 / 72, 150 / 72)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            png_bytes = pix.tobytes("png")
            scanned_pages.append((page_idx, png_bytes))

    text_count = len(page_texts)
    scan_count = len(scanned_pages)
    logger.info(
        f"[EXTRACT] Pass 1 done — {text_count} text pages, {scan_count} scanned pages"
    )
    doc.close()

    # Pass 2 — parallel PaddleOCR for scanned pages
    if scanned_pages:
        logger.info(f"[OCR] Starting parallel PaddleOCR on {scan_count} pages "
                    f"({OCR_WORKERS} workers)…")
        # Warm up PaddleOCR before spawning threads (avoids race condition)
        _get_paddle_ocr()

        ocr_results: list[tuple[int, str]] = []
        with ThreadPoolExecutor(max_workers=OCR_WORKERS) as executor:
            futures = {
                executor.submit(_ocr_page, page_idx, png_bytes): page_idx
                for page_idx, png_bytes in scanned_pages
            }
            for future in as_completed(futures):
                page_idx, ocr_text = future.result()
                if ocr_text.strip():
                    ocr_results.append((page_idx + 1, ocr_text))
                    logger.debug(
                        f"[OCR] Page {page_idx + 1}: {len(ocr_text)} chars extracted"
                    )

        logger.info(f"[OCR] PaddleOCR finished — {len(ocr_results)} scanned pages with text")
        page_texts.extend(ocr_results)

    # Sort by page number so chunking preserves document order
    page_texts.sort(key=lambda x: x[0])
    return page_texts


# ---------------------------------------------------------------------------
# Vector store builder
# ---------------------------------------------------------------------------

def get_or_build_vector_store(
    pdf_path: str,
    file_bytes: bytes,
    progress_cb=None,          # callable(stage, message, progress_pct) | None
) -> tuple[Chroma, str]:
    """
    Build and cache the vector store for a PDF.

    Pipeline:
    1. Hybrid text extraction (PyMuPDF + PaddleOCR)
    2. Recursive character splitting
    3. Batch embedding (single sentence-transformers pass)
    4. Bulk ChromaDB insert (single transaction)

    Returns (vector_store, file_hash).
    Cached result is returned instantly on subsequent calls.
    progress_cb — optional callable(stage, user_message, progress_pct).
    """
    def _cb(stage: str, message: str, pct: int):
        if progress_cb:
            try:
                progress_cb(stage, message, pct)
            except Exception:
                pass

    file_hash = _get_file_hash(file_bytes)

    if file_hash in _cached_vector_stores:
        logger.info(f"[BUILD] Cache hit for hash {file_hash[:8]} — skipping processing")
        _cb('done', 'Already processed — loading instantly!', 95)
        return _cached_vector_stores[file_hash], file_hash

    logger.info(f"[BUILD] Building vector store for hash {file_hash[:8]}…")

    # ── Step 1: Extract text ─────────────────────────────────────────────────
    _cb('reading', 'Reading your PDF… this may take a moment, please wait.', 20)
    page_texts = _extract_text_hybrid(pdf_path)
    if not page_texts:
        raise ValueError("No text could be extracted from the PDF. "
                        "The file may be corrupted or empty.")

    total_chars = sum(len(t) for _, t in page_texts)
    logger.info(f"[BUILD] Extraction complete: {len(page_texts)} pages, "
                f"{total_chars:,} total chars")

    _cb('organising', f'Organising {len(page_texts)} pages of content…', 45)

    # ── Step 2: Build LangChain Documents ───────────────────────────────────
    raw_docs = [
        Document(
            page_content=text,
            metadata={"source": pdf_path, "page": page_num - 1},  # 0-indexed for compat
        )
        for page_num, text in page_texts
    ]

    # ── Step 3: Split into chunks ────────────────────────────────────────────
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(raw_docs)
    logger.info(f"[BUILD] Split into {len(chunks)} chunks")

    if not chunks:
        raise ValueError("PDF produced no text chunks after splitting.")

    # ── Step 4: Batch-compute embeddings ─────────────────────────────────────
    _cb('understanding', 'Understanding your document… please wait.', 60)
    logger.info(f"[BUILD] Computing embeddings for {len(chunks)} chunks "
                f"(model=all-MiniLM-L6-v2, batch_size={EMBED_BATCH_SIZE})…")
    texts_to_embed = [c.page_content for c in chunks]

    # For large PDFs encode in sub-batches so progress_cb fires regularly
    # instead of hanging at 60% for 10+ minutes.
    if len(texts_to_embed) > EMBED_SUB_BATCH:
        import numpy as np
        all_vecs = []
        total_sub = len(texts_to_embed)
        for sub_start in range(0, total_sub, EMBED_SUB_BATCH):
            sub_end  = min(sub_start + EMBED_SUB_BATCH, total_sub)
            sub_pct  = 60 + int(18 * sub_end / total_sub)  # 60 → 78 %
            sub_msg  = (
                f'Understanding your document… '
                f'{sub_end}/{total_sub} sections processed.'
            )
            _cb('understanding', sub_msg, sub_pct)
            vecs = _st_model.encode(
                texts_to_embed[sub_start:sub_end],
                batch_size=EMBED_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )
            all_vecs.append(vecs)
            logger.info(f"[BUILD] Embedded {sub_end}/{total_sub} chunks")
        embeddings_matrix = np.vstack(all_vecs)
    else:
        embeddings_matrix = _st_model.encode(
            texts_to_embed,
            batch_size=EMBED_BATCH_SIZE,
            show_progress_bar=False,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
    logger.info(f"[BUILD] Embeddings computed: shape {embeddings_matrix.shape}")

    # ── Step 5: Bulk insert into ChromaDB ───────────────────────────────────
    _cb('indexing', 'Making your document searchable… almost done!', 78)
    logger.info("[BUILD] Inserting into ChromaDB (bulk transaction)…")

    collection_name = f"pdf_chat_{file_hash}"

    # Build the Chroma collection using langchain_chroma wrapper
    # We pass precomputed embeddings to skip re-embedding inside Chroma
    import chromadb

    chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

    # Drop existing collection if present (handles re-uploads of same file)
    try:
        chroma_client.delete_collection(collection_name)
    except Exception:
        pass

    collection = chroma_client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "l2"},
    )

    # Prepare bulk data
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [c.metadata for c in chunks]
    documents_text = [c.page_content for c in chunks]
    embeddings_list = embeddings_matrix.tolist()

    # Single bulk add — massive performance gain vs one-by-one
    BATCH_SIZE = 5000  # Chroma handles up to ~41,600 per call
    for start in range(0, len(ids), BATCH_SIZE):
        end = start + BATCH_SIZE
        collection.add(
            ids=ids[start:end],
            documents=documents_text[start:end],
            embeddings=embeddings_list[start:end],
            metadatas=metadatas[start:end],
        )
        logger.info(f"[BUILD] Inserted batch {start}–{end} of {len(ids)}")

    # Wrap in LangChain Chroma for retrieval compatibility
    vector_store = Chroma(
        client=chroma_client,
        collection_name=collection_name,
        embedding_function=_embeddings,
    )

    _cached_vector_stores[file_hash] = vector_store
    logger.info(f"[BUILD] ✅ Vector store ready — {len(chunks)} chunks indexed")

    return vector_store, file_hash


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

def create_session(file_hash: str, model=None) -> str:
    """Create a new conversation thread for a PDF tab."""
    short_id = str(uuid.uuid4())[:8]
    thread_id = f"pdf_chat_{file_hash[:8]}_{short_id}"
    _conversation_history[thread_id] = []
    _session_threads[file_hash] = thread_id
    return thread_id


def clear_session(thread_id: str) -> None:
    """Remove conversation history and vector store when a tab is closed."""
    _conversation_history.pop(thread_id, None)

    hash_to_remove = None
    for file_hash, tid in list(_session_threads.items()):
        if tid == thread_id:
            hash_to_remove = file_hash
            break
    if hash_to_remove:
        _cached_vector_stores.pop(hash_to_remove, None)
        _session_threads.pop(hash_to_remove, None)


def delete_vector_store(file_hash: str) -> bool:
    """
    Permanently delete a PDF's ChromaDB collection from disk AND memory.
    Called when the user removes a PDF from history.
    Returns True if the collection was found and deleted, False otherwise.
    """
    collection_name = f"pdf_chat_{file_hash}"

    # 1. Remove from in-memory caches
    _cached_vector_stores.pop(file_hash, None)

    # Remove associated thread if any
    thread_to_remove = _session_threads.pop(file_hash, None)
    if thread_to_remove:
        _conversation_history.pop(thread_to_remove, None)
        logger.info(f"[DELETE] Cleared active session thread {thread_to_remove}")

    # 2. Delete the persisted ChromaDB collection from disk
    try:
        import chromadb
        client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        existing = [c.name for c in client.list_collections()]
        if collection_name in existing:
            client.delete_collection(collection_name)
            logger.info(f"[DELETE] ✅ Deleted ChromaDB collection: {collection_name}")
            return True
        else:
            logger.info(f"[DELETE] Collection not found (already gone): {collection_name}")
            return False
    except Exception as exc:
        logger.error(f"[DELETE] Failed to delete collection {collection_name}: {exc}")
        return False


# ---------------------------------------------------------------------------
# Retrieval — query-type classifiers
# ---------------------------------------------------------------------------

# ── 1. META / overview queries ────────────────────────────────────────────
# "Summarise this PDF", "What topics are covered?", "Table of contents"
_META_QUERY_PHRASES = (
    "this pdf", "this document", "the pdf", "the document",
    "topics covered", "what topics", "what are the topics",
    "what is covered", "what does it cover",
    "summarize", "summarise", "summary", "give me a summary", "give a summary",
    "overview", "what is in this", "what does this contain",
    "table of contents", "list all topics", "what are all",
    "tell me about this", "explain this pdf", "explain this document",
    "what can i learn", "what will i learn",
    "explain the topics", "explain topics in this", "topics in this",
    "what topics are in", "all topics", "the topics",
    "list the topics", "tell me the topics", "give me topics",
    "what is covered in", "what's covered in", "what is in",
    "how many main chapters", "how many chapters",
    "what comes after", "what chapter comes after",
    "what are the names of", "names of the",
    # Chapter structure questions
    "title of chapter", "chapter title", "the title of chapter",
    "what is the title", "name of chapter", "chapter name",
    "first five chapters", "first chapter", "last chapter",
    "all chapters", "list chapters", "list the chapters",
)

# ── 2. Chapter-location queries ───────────────────────────────────────────
# "Which chapter discusses X?", "In which chapter is Y mentioned?"
_CHAPTER_QUERY_PHRASES = (
    "which chapter", "what chapter", "in which chapter",
    "where does the author explain", "where does the author discuss",
    "where does the author introduce", "where is it mentioned",
    "where does the book", "in which section", "where in the book",
    "which chapter contains", "which chapter introduces",
    "which chapter discusses", "which chapter explains",
)

# ── 3. Comparison queries ─────────────────────────────────────────────────
# "Compare X and Y", "Difference between X and Y"
_COMPARISON_QUERY_PHRASES = (
    "compare", "comparison between", "difference between",
    "contrast", "how do they differ", "both of them",
    "versus", " vs ", "how does x differ",
)

# ── 4. List / enumeration queries ────────────────────────────────────────
# "Name four things", "List the main points", "What are the lessons?"
_LIST_QUERY_PHRASES = (
    "name four", "name all", "name the", "list all", "list the",
    "what are the names", "four things", "give four",
    "enumerate", "what lessons", "what examples", "what stories",
    "two main lessons", "main lessons", "key lessons",
)

# ── 5. Paraphrase / semantic queries ─────────────────────────────────────
# Rephrased versions of direct questions — needs higher k for recall
_PARAPHRASE_INDICATORS = (
    "according to the author", "what does the author think",
    "what does the author say", "explain the author's view",
    "in simple words", "explain in simple", "why does the author",
    "what is meant by", "what does", "how does",
)

# ── 6. Page-range queries ─────────────────────────────────────────────────
# "between page 5 to 10", "pages 5-10", "from page 5 through page 10"
_PAGE_RANGE_PATTERN = re.compile(
    r'\bpage[s]?\s*(\d+)\s*(?:to|through|and|-|–|—)\s*(?:page\s*)?(\d+)\b',
    re.IGNORECASE,
)

# ── 7. Specific single-page queries ───────────────────────────────────────
# "on page 7", "page 12", "solve the question on page 7"
_SPECIFIC_PAGE_PATTERN = re.compile(r'\bpage\s*(\d+)\b', re.IGNORECASE)

# ── 8. "Solve this" intent — combined with a page reference ───────────────
_SOLVE_QUERY_PHRASES = (
    "solve", "answer the question", "answer this question", "solve this",
    "solve the question", "solve it", "work out", "find the solution",
    "give the solution", "solve the problem", "answer the problem",
    "answer these", "solve these",
)

# ── 9. Advisory / knowledge-augmented queries ─────────────────────────────
# On-topic questions that need the LLM's own judgement/expertise, not just
# what's literally printed in the document — e.g. prioritisation, study
# advice, recommendations, opinions about the material.
_ADVISORY_QUERY_PHRASES = (
    "should i", "which topics should", "important topics", "most important",
    "priority", "prioritize", "prioritise", "focus on", "which is more important",
    "worth learning", "must know", "must learn", "should i prepare",
    "should i learn", "should i study", "for placements", "for interviews",
    "for my interview", "for my placement", "recommend", "suggest",
    "what order should i", "order to study", "order to learn",
    "before my placement", "before placements", "which one is better",
    "your opinion", "what do you think", "in your opinion", "any advice",
    "how should i prepare", "what should i prepare",
)


def _is_meta_query(query: str) -> bool:
    q = query.lower().strip()
    if any(phrase in q for phrase in _META_QUERY_PHRASES):
        return True
    # Catch "chapter 7", "chapter 1", "chapter 12" etc.
    if re.search(r'\bchapter\s+\d+\b', q):
        return True
    return False


def _is_chapter_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _CHAPTER_QUERY_PHRASES)


def _is_comparison_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _COMPARISON_QUERY_PHRASES)


def _is_list_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _LIST_QUERY_PHRASES)


def _is_paraphrase_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _PARAPHRASE_INDICATORS)


def _extract_page_range(query: str) -> Optional[tuple[int, int]]:
    """Return (start, end) 1-indexed page numbers if the query bounds itself
    to a page range, e.g. 'between page 5 to 10' or 'pages 5-10'."""
    m = _PAGE_RANGE_PATTERN.search(query)
    if not m:
        return None
    start, end = int(m.group(1)), int(m.group(2))
    if start > end:
        start, end = end, start
    return start, end


def _extract_specific_page(query: str) -> Optional[int]:
    """Return a single 1-indexed page number if the query references exactly
    one page (and is NOT already a range, which is checked separately)."""
    if _PAGE_RANGE_PATTERN.search(query):
        return None
    m = _SPECIFIC_PAGE_PATTERN.search(query)
    return int(m.group(1)) if m else None


def _is_solve_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _SOLVE_QUERY_PHRASES)


def _is_advisory_query(query: str) -> bool:
    q = query.lower().strip()
    return any(phrase in q for phrase in _ADVISORY_QUERY_PHRASES)


def _l2_to_cosine_similarity(l2_distance: float) -> float:
    """Convert L2 distance to cosine similarity for unit-normalised vectors."""
    l2_distance = max(0.0, l2_distance)
    return 1.0 - (l2_distance ** 2) / 2.0


def _docs_from_get_result(raw: dict) -> list[Document]:
    """Build Document objects from a raw vector_store.get() result dict,
    sorted by page number."""
    docs = [
        Document(page_content=doc, metadata=meta)
        for doc, meta in zip(raw.get("documents") or [], raw.get("metadatas") or [])
    ]
    docs.sort(key=lambda d: d.metadata.get("page", 0))
    return docs


def retrieve_context(
    vector_store: Chroma,
    query: str,
    k: int = 8,  # raised from 5 → better recall for paraphrased / multi-hop questions
) -> tuple[str, list, float]:
    """
    Route the query through the appropriate retrieval strategy:

    PAGE_RANGE   – exact metadata filter fetch for an explicit page range
                (e.g. "between page 5 to 10") — bypasses similarity search
                entirely so nothing in the range is missed.
    PAGE_SPECIFIC– exact metadata filter fetch for a single referenced page
                (e.g. "solve the question on page 7").
    META         – full-document scan (k=60) for overview / summary questions
    ADVISORY     – full-document scan (k=60), same as META — the user is
                asking for judgement/recommendations that need the whole
                topic list as context, even though the answer itself will
                lean on the LLM's own knowledge.
    CHAPTER      – wide scan (k=20, relaxed threshold) to find chapter headings
    COMPARISON   – broad scan (k=12) to retrieve info about both subjects
    LIST         – broad scan (k=12) to collect all enumerable items
    PARAPHRASE   – standard scan (k=10, slightly relaxed threshold)
    DEFAULT      – standard scan (k=8, strict threshold)
    """
    # ── PAGE-RANGE path ────────────────────────────────────────────────────
    page_range = _extract_page_range(query)
    if page_range:
        start, end = page_range
        logger.info(f"[RAG] PAGE-RANGE query: pages {start}-{end}")
        where_filter = {"$and": [{"page": {"$gte": start - 1}}, {"page": {"$lte": end - 1}}]}
        try:
            raw = vector_store.get(where=where_filter, include=["documents", "metadatas"])
        except Exception as exc:
            logger.warning(f"[RAG] Page-range filter failed: {exc}")
            raw = None
        docs = _docs_from_get_result(raw) if raw else []
        if not docs:
            return "", [], 0.0
        context_parts = [
            f"[Excerpt — Page {d.metadata.get('page', 0) + 1}]\n{d.page_content}"
            for d in docs
        ]
        return "\n\n".join(context_parts), docs, 1.0

    # ── PAGE-SPECIFIC path ─────────────────────────────────────────────────
    specific_page = _extract_specific_page(query)
    if specific_page:
        logger.info(
            f"[RAG] PAGE-SPECIFIC query: page {specific_page} "
            f"(solve={_is_solve_query(query)})"
        )
        where_filter = {"page": specific_page - 1}
        try:
            raw = vector_store.get(where=where_filter, include=["documents", "metadatas"])
        except Exception as exc:
            logger.warning(f"[RAG] Specific-page filter failed: {exc}")
            raw = None
        docs = _docs_from_get_result(raw) if raw else []
        if not docs:
            return "", [], 0.0
        context_parts = [
            f"[Excerpt — Page {d.metadata.get('page', 0) + 1}]\n{d.page_content}"
            for d in docs
        ]
        return "\n\n".join(context_parts), docs, 1.0

    # ── META / ADVISORY path — both need the whole document as context ────
    if _is_meta_query(query) or _is_advisory_query(query):
        logger.info(f"[RAG] {'META' if _is_meta_query(query) else 'ADVISORY'}-QUERY: '{query}'")
        all_docs = vector_store.similarity_search(query, k=60)
        if not all_docs:
            return "", [], 0.0
        context_parts = [
            f"[Excerpt — Page {doc.metadata.get('page', 0) + 1}]\n{doc.page_content}"
            for doc in all_docs
        ]
        return "\n\n".join(context_parts), all_docs, 1.0

    # ── Determine per-query-type k and distance threshold ─────────────────────
    if _is_chapter_query(query):
        effective_k   = 20
        max_l2        = 1.5   # relaxed — chapter headings may be semantically distant
        query_type    = "CHAPTER"
    elif _is_comparison_query(query):
        effective_k   = 12
        max_l2        = MAX_L2_DISTANCE
        query_type    = "COMPARISON"
    elif _is_list_query(query):
        effective_k   = 12
        max_l2        = MAX_L2_DISTANCE
        query_type    = "LIST"
    elif _is_paraphrase_query(query):
        effective_k   = 10
        max_l2        = 1.35  # slightly relaxed for semantic rephrasing
        query_type    = "PARAPHRASE"
    else:
        effective_k   = k
        max_l2        = MAX_L2_DISTANCE
        query_type    = "SPECIFIC"

    logger.info(f"[RAG] {query_type} query | k={effective_k} | max_l2={max_l2}")

    # ── Similarity search ─────────────────────────────────────────────────────
    try:
        retrieved = vector_store.similarity_search_with_score(query, k=effective_k)
        docs_with_scores = list(retrieved)
    except (AttributeError, TypeError) as exc:
        logger.warning(f"[RAG] similarity_search_with_score failed ({exc}). Fallback.")
        retrieved_docs = vector_store.similarity_search(query, k=effective_k)
        docs_with_scores = [(doc, 2.0) for doc in retrieved_docs]

    if not docs_with_scores:
        return "", [], 0.0

    relevant = []
    for doc, l2_dist in docs_with_scores:
        cos_sim = _l2_to_cosine_similarity(l2_dist)
        page_num = doc.metadata.get("page", 0) + 1
        status = "KEPT" if l2_dist <= max_l2 else "FILTERED"
        logger.debug(
            f"  Page {page_num} | L2={l2_dist:.4f} | CosSim={cos_sim:.3f} | "
            f"{status} | {doc.page_content[:80]}…"
        )
        if l2_dist <= max_l2:
            relevant.append((doc, l2_dist))

    if not relevant:
        # Strict filter found nothing — try a broad unfiltered fallback scan
        # so the LLM (not a threshold) makes the final relevance call.
        logger.info("[RAG] Strict filter found nothing — trying broad fallback scan.")
        try:
            fallback_docs = vector_store.similarity_search(query, k=15)
        except Exception:
            fallback_docs = []
        if not fallback_docs:
            return "", [], 0.0
        context_parts = [
            f"[Excerpt — Page {d.metadata.get('page', 0) + 1}]\n{d.page_content}"
            for d in fallback_docs
        ]
        # score=0.4: "found plausible context" — LLM decides actual relevance
        return "\n\n".join(context_parts), fallback_docs, 0.4

    avg_similarity = sum(
        _l2_to_cosine_similarity(s) for _, s in relevant
    ) / len(relevant)

    logger.info(
        f"[RAG] Kept {len(relevant)}/{len(docs_with_scores)} chunks | "
        f"Avg cosine: {avg_similarity:.3f}"
    )

    context_parts = [
        f"[Excerpt — Page {doc.metadata.get('page', 0) + 1}]\n{doc.page_content}"
        for (doc, _) in relevant
    ]
    return "\n\n".join(context_parts), [d for d, _ in relevant], avg_similarity


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

# Phrases the LLM uses when it cannot answer from context
_NO_INFO_PHRASES = (
    "I cannot find this information",
    "not in the provided document",
    "the document does not contain",
    "not mentioned in the",
    "no information about",
    "is not discussed in",
    "is not covered in",
    "cannot be found in",
    "not present in the",
)

# ---------------------------------------------------------------------------
# Shared prompt building blocks
# ---------------------------------------------------------------------------

# Grounding — prepended to every prompt. Tells the model what "this" means
# and anchors it to the uploaded PDF without mentioning retrieval internals.
_DOC_GROUNDING = (
    "You are a knowledgeable study assistant helping a user work through a "
    "specific PDF document they have uploaded. Every question the user asks — "
    "including when they say 'this', 'this document', 'this book', 'the pdf', "
    "'it', 'the document' — refers to that uploaded PDF. Do NOT treat these as "
    "references to any external source.\n\n"
)

# Response-style policy — applied to every prompt regardless of query type.
_RESPONSE_POLICY = """
RESPONSE STYLE — Final Answer Only Policy:
A. Output ONLY the final answer. No preamble, no reasoning steps, no process.
✓ Good: "Chapter 7 is titled **Freedom**."
✗ Bad:  "This is listed in the table of contents on Page 4..."
B. NEVER reveal your reasoning process, thinking steps, or how you derived
the answer. Do NOT write things like:
- "Based on the excerpts...", "After reading the context..."
- "The excerpt shows", "The provided text states"
- "According to the retrieved document", "The context mentions"
- "Vector search", "Retrieved chunk", "Matching passage"
(Exception: when actually SOLVING a problem, showing worked steps toward
the solution is part of the answer itself, not process-narration — that's
fine and expected.)
C. NEVER include self-corrections, retractions, or second-guessing.
Do NOT write things like:
- "(Note: ...)", "(Self-Correction: ...)", "(Correction: ...)"
- "However, upon reflection...", "I must correct my earlier answer"
- "Let me re-read...", "Upon re-evaluating..."
- "Actually, ..." to contradict something you just said
D. Do NOT cite page numbers inside your answer text — citations are added
automatically. Never write "Page X" or "(Page X)" or "[Page X]".
E. Every sentence must deliver value to the user. Zero meta-commentary.
F. Think like ChatGPT: deliver the answer directly, nothing else.
"""

# Grounding policy — how to decide what counts as answerable, and when to
# lean on general knowledge vs. the document itself. This replaces a purely
# "never go beyond the excerpts" rule: the PDF is the primary source, but the
# assistant should still be genuinely useful for on-topic questions that
# reach beyond the literal text, and should only refuse when a question has
# no real connection to the document at all.
_GROUNDING_POLICY = """
HOW TO DECIDE WHAT TO ANSWER — follow this priority order:

1. FIRST, check whether the document excerpts below answer the question,
even partially. If they do, base your answer primarily on them. This is
always your first move for factual, structural, or content questions
about the PDF (e.g. explaining a topic, defining a term, describing what
a chapter covers, listing what appears in the document, working through
a question printed in the document).

2. If the question is about the PDF's subject area but asks for something
the document itself doesn't state outright — synthesis, prioritisation,
study advice, comparisons to outside concepts, "which of these matters
most for interviews/placements", general elaboration on a topic the PDF
introduces — you SHOULD use your own knowledge to give a genuinely
useful answer. Ground it in what the document covers where you can, and
add your own expertise on top. Do not refuse just because the exact
answer isn't printed in the excerpts — that is expected and welcome here.

3. Only decline to answer if the question has NO connection at all to the
uploaded PDF's subject matter or content — e.g. small talk, the current
time/date, asking the meaning of a random unrelated word, general
trivia with nothing to do with the document's topic. In that case,
and ONLY in that case, respond with:
"I cannot find this information in the provided document. Please ask
questions only about the content in the uploaded PDF."

4. When solving a question that is printed inside the document (e.g. "solve
the question on page 7"), actually work through and answer it — give the
full solution/explanation, don't just restate the question back.

5. When the user bounds their question to a page or page range, answer
using only what falls within that range, and say so briefly if the
range doesn't fully cover what they asked for.

6. Never invent facts about the document itself (e.g. don't make up a page
number, chapter title, or quote that isn't in the excerpts) — the
flexibility in rule 2 is about adding your own outside knowledge and
perspective, not about fabricating document content.

7. Do NOT include citation numbers like [1], [2], [3] in your response.

8. NEVER mention "excerpt", "chunk", "retrieval", "system instructions",
"context window", "system prompt", or any other internal/technical term.

9. Your response must read like it came from a knowledgeable human tutor,
never like a system narrating its own process.
"""


def _build_system_prompt(query: str, context: str) -> str:
    """
    Return the best system prompt for the query type.
    All prompts embed the response-style policy and the grounding policy.
    """
    # ── 1. PAGE-RANGE — explicit "between page X to Y" ────────────────────────
    page_range = _extract_page_range(query)
    if page_range:
        start, end = page_range
        solve_note = (
            "\n• The user wants you to actually work through and solve any "
            "questions found in this range — give full solutions, not just "
            "restatements.\n" if _is_solve_query(query) else ""
        )
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + f"\nROLE: You are answering a question the user has explicitly "
            f"bounded to pages {start}\u2013{end} of the document.\n"
            "TASK: Answer using only the excerpts below, which are drawn from "
            "that page range.\n"
            "• Cover everything relevant found in this range — don't truncate.\n"
            "• If the range contains less than expected, say so briefly rather "
            "than padding the answer.\n"
            + solve_note
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS (Pages {start}-{end}) ===\n{context}\n=== END ==="
        )

    # ── 2. PAGE-SPECIFIC — a single referenced page ────────────────────────────
    specific_page = _extract_specific_page(query)
    if specific_page and _is_solve_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + f"\nROLE: You are solving a question that is printed on page "
            f"{specific_page} of the document.\n"
            "TASK: Find the question(s) in the excerpt below and actually "
            "work through and answer them — give the full solution or "
            "explanation, not just a restatement of the question.\n"
            "• If there are multiple sub-questions on the page, answer each one.\n"
            "• Showing your working as part of the solution is expected here — "
            "that's the answer, not process-narration.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPT (Page {specific_page}) ===\n{context}\n=== END ==="
        )
    if specific_page:
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + f"\nROLE: You are answering a question about page {specific_page} "
            "of the document.\n"
            "TASK: Answer using only the excerpt from that page below.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPT (Page {specific_page}) ===\n{context}\n=== END ==="
        )

    # ── 3. OVERVIEW / META ────────────────────────────────────────────────────
    if _is_meta_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + "\nROLE: You are a document overview assistant.\n"
            "TASK: Answer the user's question directly using the excerpts "
            "below, which span the whole document.\n"
            "• For chapter title questions: state the title immediately, e.g. "
            "\"Chapter 7 is titled **Freedom**.\"\n"
            "• For table-of-contents questions: list chapters in order, one per line.\n"
            "• For overview questions: give a structured summary of the main topics.\n"
            "• Preserve document order. List chapter names EXACTLY as they appear.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS ===\n{context}\n=== END ==="
        )

    # ── 4. ADVISORY — knowledge-augmented recommendations ─────────────────────
    if _is_advisory_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + "\nROLE: You are a study-planning assistant with full knowledge "
            "of this document's topics AND general subject-matter expertise.\n"
            "TASK: The user wants guidance that goes beyond what's literally "
            "printed in the document — e.g. which topics to prioritise, what's "
            "most important for interviews/placements, or a recommendation "
            "between options.\n"
            "• Use the excerpts to know exactly what topics this document covers.\n"
            "• Then use your own knowledge and judgement to actually answer the "
            "advice question — rank, recommend, or explain priority as asked.\n"
            "• Be direct and specific, not vague hedging like \"it depends\".\n"
            "• You do not need every claim to be traceable to the excerpts here "
            "— this is exactly the kind of question where your own expertise "
            "should lead.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS (for topic reference) ===\n{context}\n=== END ==="
        )

    # ── 5. CHAPTER-LOCATION ───────────────────────────────────────────────────
    if _is_chapter_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + "\nROLE: You are a document index assistant.\n"
            "TASK: Tell the user which chapter or section covers the requested topic.\n"
            "• Lead with the chapter name/number, e.g. "
            "\"This topic is covered in Chapter 3: Never Enough.\"\n"
            "• If multiple chapters cover it, list them concisely.\n"
            "• If the chapter cannot be identified from the excerpts, say so plainly.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS ===\n{context}\n=== END ==="
        )

    # ── 6. COMPARISON ────────────────────────────────────────────────────────
    if _is_comparison_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + "\nROLE: You are a comparison assistant.\n"
            "TASK: Compare the entities the user asks about.\n"
            "• Open with a one-sentence summary of the key difference or similarity.\n"
            "• Then give a structured breakdown (e.g. Background | Outcome | Lesson).\n"
            "• Use the excerpts as your primary source; if the document is "
            "silent on one side of the comparison, you may draw on your own "
            "knowledge to fill that gap, and say so briefly.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS ===\n{context}\n=== END ==="
        )

    # ── 7. LIST / ENUMERATION ────────────────────────────────────────────────
    if _is_list_query(query):
        return (
            _DOC_GROUNDING
            + _RESPONSE_POLICY
            + "\nROLE: You are a list-extraction assistant.\n"
            "TASK: Collect and return all requested items from the excerpts.\n"
            "• Present items as a clean numbered or bulleted list.\n"
            "• Include every item found — do not truncate.\n"
            "• If the excerpts contain fewer items than asked, say so rather "
            "than padding the list with invented ones.\n"
            + _GROUNDING_POLICY
            + f"\n=== DOCUMENT EXCERPTS ===\n{context}\n=== END ==="
        )

    # ── 8. DEFAULT — specific / paraphrased / semantic questions ──────────────
    return (
        _DOC_GROUNDING
        + _RESPONSE_POLICY
        + "\nROLE: You are a precise, helpful document study assistant.\n"
        "TASK: Answer the question below.\n"
        "GUIDANCE:\n"
        "• Factual question about the document → clear, direct answer grounded "
        "in the excerpts, elaborate briefly if useful.\n"
        "• 'Why' / 'How' questions about the document's content → explain the "
        "reasoning or mechanism as stated in the excerpts.\n"
        "• If the question is on-topic but reaches beyond the literal text "
        "(e.g. asking for a clearer explanation, real-world context, or an "
        "example not in the document), use your own knowledge to help, while "
        "staying consistent with what the document says.\n"
        + _GROUNDING_POLICY
        + f"\n=== DOCUMENT EXCERPTS ===\n{context}\n=== END ==="
    )


# Pronouns / vague references that Sonar mistakes for web queries
_PRONOUN_REPLACEMENTS = [
    # Order matters — longer phrases first
    (r'\bthis document\b',  'the uploaded PDF'),
    (r'\bthis pdf\b',       'the uploaded PDF'),
    (r'\bthis book\b',      'the uploaded PDF'),
    (r'\bthis text\b',      'the uploaded PDF'),
    (r'\bthis material\b',  'the uploaded PDF'),
    (r'\bthis content\b',   'the uploaded PDF'),
    (r'\bthe document\b',   'the uploaded PDF'),
    (r'\bthe book\b',       'the uploaded PDF'),
    (r'\bthe text\b',       'the uploaded PDF'),
    (r'\bin this\b',        'in the uploaded PDF'),
    (r'\bof this\b',        'of the uploaded PDF'),
    (r'\bfrom this\b',      'from the uploaded PDF'),
    (r'\babout this\b',     'about the uploaded PDF'),
]

_PDF_ANCHOR_PREFIX = (
    "Using ONLY the document context provided in the system prompt "
    "(do NOT search the web), answer this question about the uploaded PDF: "
)


def _anchor_query_to_pdf(query: str) -> str:
    """
    Rewrite the user query so Perplexity Sonar treats it as a PDF question,
    not a general web search.

    Steps:
    1. Replace vague pronouns ('this', 'the document', 'this book'…) with
    the explicit phrase 'the uploaded PDF'.
    2. Prepend a hard anchor prefix instructing Sonar to use ONLY the context.
    """
    import re as _re
    q = query.strip()
    for pattern, replacement in _PRONOUN_REPLACEMENTS:
        q = _re.sub(pattern, replacement, q, flags=_re.IGNORECASE)
    return f"{_PDF_ANCHOR_PREFIX}{q}"


def build_answer(
    thread_id: str,
    context: str,
    query: str,
    source_docs: list,
    relevance_score: float = 0.5,
    display_query: str | None = None,
) -> str:
    """
    Invoke the LLM with per-tab conversation history.
    Gate 1: truly empty source_docs (broken/empty store) → reject.
    Gate 2: LLM refuses                                  → skip citations.

    NOTE: relevance_score == 0.0 no longer triggers a hard rejection.
    The LLM (via _RESPONSE_POLICY) decides whether the context is
    relevant — this prevents on-topic advisory questions from being
    silently killed by the distance threshold before the model sees them.
    """
    model = _rag_model
    # The query stored in history is always the original user message.
    stored_query = display_query if display_query is not None else query
    logger.info(
        f"[ANSWER] META={_is_meta_query(query)} ADVISORY={_is_advisory_query(query)} "
        f"CHAPTER={_is_chapter_query(query)} CMP={_is_comparison_query(query)} "
        f"LIST={_is_list_query(query)} PAGE_RANGE={_extract_page_range(query)} "
        f"PAGE={_extract_specific_page(query)} score={relevance_score:.3f} "
        f"docs={len(source_docs)}"
    )

    # Gate 1 — only for a genuinely empty result (broken/empty vector store)
    if not source_docs:
        logger.info("[ANSWER] REJECTED — no source docs at all.")
        msg = (
            "❌ **This question does not appear to be related to the PDF content.**\n\n"
            "The document does not contain information that matches your query. "
            "Please ask questions only about the content in the uploaded PDF.\n\n"
            "💡 **Tip:** Try rephrasing your question using terms from the document."
        )
        history = _conversation_history.get(thread_id, [])
        _conversation_history[thread_id] = history + [
            {"role": "user", "content": stored_query},
            {"role": "assistant", "content": msg},
        ]
        return msg

    logger.info(f"[ANSWER] ACCEPTED — calling LLM with {len(source_docs)} chunks")
    history = _conversation_history.get(thread_id, [])

    system_prompt = _build_system_prompt(query, context)

    # ── Anchor the query to the PDF so Sonar doesn't search the web ──────────
    # We rewrite vague pronouns → explicit "the uploaded PDF", then prefix the
    # question with a hard anchor. The ORIGINAL query is kept in history so the
    # conversation reads naturally; only the LLM receives the anchored version.
    anchored_query = _anchor_query_to_pdf(query)
    logger.info(f"[ANSWER] Anchored query: {anchored_query!r}")

    messages = [{"role": "system", "content": system_prompt}] + history + [
        {"role": "user", "content": anchored_query}
    ]

    response = model.invoke(messages)
    raw_answer = response.content if hasattr(response, "content") else str(response)

    if not raw_answer or not raw_answer.strip():
        raw_answer = "Could not generate an answer. Please try again."

    # Strip citation markers the LLM produces ([1], [2], etc.)
    raw_answer = re.sub(r'\[\d+\](?:\[\d+\])*', '', raw_answer).strip()

    # Strip [Excerpt — Page X] markers that Sonar leaks
    raw_answer = re.sub(r'\[Excerpt\s*[\u2014\-]+\s*Page\s*\d+\]', '', raw_answer, flags=re.IGNORECASE).strip()

    # Post-process: remove self-contradiction preambles ('Note:', 'Correction:')
    answer = _sanitise_answer(raw_answer)

    # Persist conversation turn — always store the original user message
    _conversation_history[thread_id] = history + [
        {"role": "user", "content": stored_query},
        {"role": "assistant", "content": answer},
    ]

    # Gate 3 — append page citations only when LLM actually answered
    answer_lower = answer.lower()
    llm_refused = any(p.lower() in answer_lower for p in _NO_INFO_PHRASES)

    if not llm_refused:
        sources = sorted(
            {doc.metadata.get("page", 0) + 1 for doc in source_docs}
        )
        if sources:
            pages = ", ".join(f"Page {p}" for p in sources)
            answer = f"{answer}\n\n📄 **Sources:** {pages}"
            logger.info(f"[ANSWER] Sources: {pages}")
    else:
        logger.info("[ANSWER] LLM indicated info not found — skipping citations.")

    return answer

# ---------------------------------------------------------------------------
# Post-processing helpers
# ---------------------------------------------------------------------------

_SELF_DOUBT_PREFIXES = (
    'note:', '(note:', 'correction:', '(correction:',
    'upon re-evaluating', 'however, upon', 'i must correct',
    'let me correct', 'let me re-read', 're-evaluating',
    'i need to correct', 'i should correct', 'upon reflection',
    'self-correction:', '(self-correction', 'corrected answer:',
    'i cannot find this information in the provided document',
    'correction based on', 'upon reviewing', 'upon re-reading',
    'therefore, i cannot', 'therefore, the answer',
)

# Regex patterns for inline parenthetical reasoning leakage
_INLINE_REASONING_PATTERNS = [
    # (Note: ...) multi-line parenthetical — use re.DOTALL via flag in _strip_inline_reasoning
    r'\(\s*(?:note|self-correction|correction|however|caveat|clarification|disclaimer)[^)]*\)',
    # Multi-line (Note: ...) that spans several lines — greedy match up to closing paren
    r'\(\s*(?i:note|self-correction|correction)[\s\S]*?\)',
    # "However, since the full text..." trailing qualifications
    r'(?i)however,\s+since\s+the\s+(?:full\s+)?(?:text|content|excerpts?)\s+(?:for\s+these\s+pages?\s+)?(?:is|are)\s+not\s+fully\s+(?:present|available|provided)[^.]*\.',
    # Parenthetical page-count disclaimers
    r'\(\s*(?:only\s+)?(?:fragments?|partial|excerpts?)\s+(?:are\s+)?provided[^)]*\)',
    # "The most accurate answer based strictly on..."
    r'(?i)the most accurate answer based strictly on[^.]*\.',
    # "Based on the excerpts provided for pages..."
    r'(?i)based on the (?:excerpts?|context|provided (?:text|excerpts?)) (?:provided )?for[^,\.]*[,\.]',
    # "The provided excerpts do not include..."
    r'(?i)the provided excerpts? do not (?:include|contain)[^.]*\.',
    # "(Note: The provided excerpts do not ...)"
    r'\([^)]*provided excerpts?[^)]*\)',
    # [Excerpt — Page X] inline markers (em-dash or hyphen)
    r'\[Excerpt\s*[\u2014\-]+\s*Page\s*\d+\]',
    # Though text notes X / text notes Y inline qualifiers
    r'\(though\s+text\s+notes[^)]*\)',
]


def _strip_inline_reasoning(text: str) -> str:
    """Remove inline parenthetical reasoning/disclaimers from Sonar output."""
    for pattern in _INLINE_REASONING_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)
    # Collapse triple+ newlines left behind
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Clean up stray whitespace before punctuation left by removals
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def _find_corrected_answer_block(text: str) -> str | None:
    """
    If the model wrote a long response with a 'Corrected Answer:' / 'Correction based on...'
    section, extract just the answer part.
    """
    # Match "Corrected Answer:" / "Final Answer:" labels
    m = re.search(
        r'(?i)(?:corrected\s+answer|final\s+answer)\s*(?:\([^)]*\))?\s*:\s*(.+)',
        text,
        flags=re.DOTALL,
    )
    if m:
        return m.group(1).strip()

    # Match "Correction based on re-evaluating...: <answer>"
    m = re.search(
        r'(?i)correction\s+based\s+on[^:]*:\s*(.+)',
        text,
        flags=re.DOTALL,
    )
    if m:
        return m.group(1).strip()

    return None


def _sanitise_answer(text: str) -> str:
    """
    Remove reasoning leakage that Perplexity Sonar produces.

    Handles these Sonar quirks:
    A. Explicit 'Corrected Answer:' / 'Correction based on...' blocks → extract only that.
    B. Explicit 'Correction:' block                                   → extract only that.
    C. Self-doubt first paragraph(s)                                  → drop them.
    D. Any paragraph that is purely meta-commentary                   → strip it.
    E. Inline parenthetical/bracket reasoning markers                 → strip them.
    """
    # ── A. 'Corrected Answer:' / 'Correction based on...' → keep only the answer ──
    corrected = _find_corrected_answer_block(text)
    if corrected:
        return _strip_inline_reasoning(corrected)

    # ── B. Explicit 'Correction:' block ───────────────────────────────────────────
    correction_match = re.search(
        r'(?:^|\n)Correction:\s*(.+)',
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if correction_match:
        return _strip_inline_reasoning(correction_match.group(1).strip())

    # ── C. Drop self-doubt paragraphs from the top ────────────────────────────────
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    # Keep dropping leading paragraphs as long as they are self-doubt
    while paragraphs:
        first_lower = paragraphs[0].lower()
        if any(first_lower.startswith(ph) for ph in _SELF_DOUBT_PREFIXES):
            paragraphs = paragraphs[1:]
        else:
            break
    if paragraphs:
        text = '\n\n'.join(paragraphs)

    # Re-split after potential drops
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]

    # ── D. Strip any paragraph that is purely meta-commentary ─────────────────────
    _META_PARA_PATTERNS = [
        r'(?i)^\(note:',
        r'(?i)^\(self-correction:',
        r'(?i)^however,\s+since\s+the\s+(full\s+)?(?:text|excerpts?)',
        r'(?i)^the most accurate answer based strictly',
        r'(?i)^based on the (?:excerpts?|context)',
        r'(?i)^the provided excerpts?\s+do not',
        r'(?i)^since\s+the\s+(?:full\s+)?(?:text|excerpts?)',
        r'(?i)^correction based on',
        r'(?i)^upon reviewing',
        r'(?i)^upon re-',
    ]
    cleaned_paragraphs = [
        p for p in paragraphs
        if not any(re.match(pat, p) for pat in _META_PARA_PATTERNS)
    ]
    if cleaned_paragraphs:
        text = '\n\n'.join(cleaned_paragraphs)

    # ── E. Strip inline parenthetical reasoning & [Excerpt — Page X] markers ─────
    return _strip_inline_reasoning(text)
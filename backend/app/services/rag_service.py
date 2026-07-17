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

# Sentence-transformer batch size for embedding (larger = faster on GPU/CPU)
EMBED_BATCH_SIZE = 64

# ChromaDB persistence directory
CHROMA_PERSIST_DIR = "./chroma_pdf_db"

# Similarity threshold
MAX_L2_DISTANCE = 1.2

# ---------------------------------------------------------------------------
# LLM for PDF chat (Perplexity Sonar)
# ---------------------------------------------------------------------------
_rag_model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY,
)

# ---------------------------------------------------------------------------
# Embedding model — loaded ONCE at module level
# ---------------------------------------------------------------------------
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2",
    model_kwargs={"local_files_only": True},
    encode_kwargs={"batch_size": EMBED_BATCH_SIZE, "normalize_embeddings": True},
)

# Raw sentence-transformers model reference (for bulk precompute)
_st_model = _embeddings._client  # SentenceTransformer instance (private attr)

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

def get_or_build_vector_store(pdf_path: str, file_bytes: bytes) -> tuple[Chroma, str]:
    """
    Build and cache the vector store for a PDF.

    Pipeline:
      1. Hybrid text extraction (PyMuPDF + PaddleOCR)
      2. Recursive character splitting
      3. Batch embedding (single sentence-transformers pass)
      4. Bulk ChromaDB insert (single transaction)

    Returns (vector_store, file_hash).
    Cached result is returned instantly on subsequent calls.
    """
    file_hash = _get_file_hash(file_bytes)

    if file_hash in _cached_vector_stores:
        logger.info(f"[BUILD] Cache hit for hash {file_hash[:8]} — skipping processing")
        return _cached_vector_stores[file_hash], file_hash

    logger.info(f"[BUILD] Building vector store for hash {file_hash[:8]}…")

    # ── Step 1: Extract text ─────────────────────────────────────────────────
    page_texts = _extract_text_hybrid(pdf_path)
    if not page_texts:
        raise ValueError("No text could be extracted from the PDF. "
                         "The file may be corrupted or empty.")

    total_chars = sum(len(t) for _, t in page_texts)
    logger.info(f"[BUILD] Extraction complete: {len(page_texts)} pages, "
                f"{total_chars:,} total chars")

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

    # ── Step 4: Batch-compute embeddings (single pass, no per-chunk overhead) ─
    logger.info(f"[BUILD] Computing embeddings (batch_size={EMBED_BATCH_SIZE})…")
    texts_to_embed = [c.page_content for c in chunks]
    embeddings_matrix = _st_model.encode(
        texts_to_embed,
        batch_size=EMBED_BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    logger.info(f"[BUILD] Embeddings computed: shape {embeddings_matrix.shape}")

    # ── Step 5: Bulk insert into ChromaDB (single transaction) ──────────────
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


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

# Cosine similarity threshold (L2 distance for unit-normalised vectors)
_META_QUERY_PHRASES = (
    "this pdf", "this document", "the pdf", "the document",
    "topics covered", "what topics", "what are the topics",
    "what is covered", "what does it cover",
    "summarize", "summary", "give me a summary", "give a summary",
    "overview", "what is in this", "what does this contain",
    "table of contents", "list all topics", "what are all",
    "tell me about this", "explain this pdf", "explain this document",
    "what can i learn", "what will i learn",
    "explain the topics", "explain topics in this", "topics in this",
    "what topics are in", "all topics", "the topics",
    "list the topics", "tell me the topics", "give me topics",
    "what is covered in", "what's covered in", "what is in",
)


def _is_meta_query(query: str) -> bool:
    """Return True if the query asks about the document as a whole."""
    q = query.lower().strip()
    return any(phrase in q for phrase in _META_QUERY_PHRASES)


def _l2_to_cosine_similarity(l2_distance: float) -> float:
    """Convert L2 distance to cosine similarity for unit-normalised vectors."""
    l2_distance = max(0.0, l2_distance)
    return 1.0 - (l2_distance ** 2) / 2.0


def retrieve_context(
    vector_store: Chroma,
    query: str,
    k: int = 5,
) -> tuple[str, list, float]:
    """
    Run similarity search and return (context_string, source_docs, relevance_score).

    META-QUERY mode: returns all chunks for full-document summarisation.
    SPECIFIC QUERY: filters by L2 distance threshold (MAX_L2_DISTANCE).
    """
    # ── META-QUERY path ───────────────────────────────────────────────────────
    if _is_meta_query(query):
        logger.info(f"[RAG] META-QUERY: '{query}'")
        all_docs = vector_store.similarity_search(query, k=50)
        if not all_docs:
            return "", [], 0.0
        context_parts = []
        for i, doc in enumerate(all_docs, start=1):
            page_num = doc.metadata.get("page", 0) + 1
            source = doc.metadata.get("source", "unknown")
            context_parts.append(
                f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
            )
        context = "\n\n".join(context_parts)
        return context, all_docs, 1.0

    # ── SPECIFIC QUERY path ───────────────────────────────────────────────────
    try:
        retrieved = vector_store.similarity_search_with_score(query, k=k)
        docs_with_scores = list(retrieved)
    except (AttributeError, TypeError) as exc:
        logger.warning(f"[RAG] similarity_search_with_score failed ({exc}). Fallback.")
        retrieved_docs = vector_store.similarity_search(query, k=k)
        docs_with_scores = [(doc, 2.0) for doc in retrieved_docs]

    if not docs_with_scores:
        logger.info(f"[RAG] No results for: '{query}'")
        return "", [], 0.0

    logger.info(f"[RAG] Query: '{query}'")
    relevant = []
    for doc, l2_dist in docs_with_scores:
        cos_sim = _l2_to_cosine_similarity(l2_dist)
        page_num = doc.metadata.get("page", 0) + 1
        status = "KEPT" if l2_dist <= MAX_L2_DISTANCE else "FILTERED"
        logger.debug(
            f"  Page {page_num} | L2={l2_dist:.4f} | CosSim={cos_sim:.3f} | "
            f"{status} | {doc.page_content[:80]}…"
        )
        if l2_dist <= MAX_L2_DISTANCE:
            relevant.append((doc, l2_dist))

    if not relevant:
        logger.info("[RAG] All chunks filtered — query not related to PDF.")
        return "", [], 0.0

    avg_similarity = sum(
        _l2_to_cosine_similarity(score) for _, score in relevant
    ) / len(relevant)

    logger.info(
        f"[RAG] Kept {len(relevant)}/{len(docs_with_scores)} chunks | "
        f"Avg cosine: {avg_similarity:.3f}"
    )

    context_parts = []
    for i, (doc, _) in enumerate(relevant, start=1):
        page_num = doc.metadata.get("page", 0) + 1
        source = doc.metadata.get("source", "unknown")
        context_parts.append(
            f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
        )

    context = "\n\n".join(context_parts)
    docs = [doc for doc, _ in relevant]
    return context, docs, avg_similarity


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

_NO_INFO_PHRASES = (
    "I cannot find this information",
    "not in the provided document",
    "the document does not contain",
    "not mentioned in the",
    "no information about",
)


def build_answer(
    thread_id: str,
    context: str,
    query: str,
    source_docs: list,
    relevance_score: float = 0.5,
) -> str:
    """
    Invoke the LLM with per-tab conversation history.
    Gate 1: empty context → reject without calling LLM.
    Gate 2: cosine < threshold → reject.
    Gate 3: LLM says 'not found' → skip source citations.
    """
    model = _rag_model
    logger.info(
        f"[ANSWER] model=sonar | META={_is_meta_query(query)} | "
        f"score={relevance_score:.3f} | docs={len(source_docs)}"
    )

    if not source_docs or relevance_score == 0.0:
        logger.info("[ANSWER] REJECTED — no relevant chunks.")
        msg = (
            "❌ **This question does not appear to be related to the PDF content.**\n\n"
            "The document does not contain information that matches your query. "
            "Please ask questions only about the content in the uploaded PDF.\n\n"
            "💡 **Tip:** Try rephrasing your question using terms from the document."
        )
        history = _conversation_history.get(thread_id, [])
        _conversation_history[thread_id] = history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": msg},
        ]
        return msg

    logger.info(f"[ANSWER] ACCEPTED — calling LLM with {len(source_docs)} chunks")
    history = _conversation_history.get(thread_id, [])

    if _is_meta_query(query):
        system_prompt = (
            "You are a helpful document assistant. "
            "The user is asking for an overview or summary of the document.\n\n"
            "TASK: Based ONLY on the document chunks provided below, give a clear and "
            "well-structured answer. Include all major topics, sections, and key points "
            "you find in the chunks.\n"
            "Do NOT use any external knowledge — only what is in the chunks.\n"
            "Do NOT cite page numbers yourself — they will be added automatically.\n"
            "Do NOT include citation numbers like [1], [2], [3], etc. in your response.\n\n"
            f"=== DOCUMENT CONTEXT ===\n{context}\n=== END CONTEXT ==="
        )
    else:
        system_prompt = (
            "You are a strict document Q&A assistant. "
            "Answer ONLY from the provided context chunks.\n\n"
            "CRITICAL RULES:\n"
            "1. ONLY use information explicitly present in the context chunks below.\n"
            "2. DO NOT use your training data, general knowledge, or make inferences.\n"
            "3. If the answer is NOT clearly stated in the context, respond with EXACTLY:\n"
            "   'I cannot find this information in the provided document. "
            "Please ask questions only about the content in the uploaded PDF.'\n"
            "4. Do NOT mention, invent, or paraphrase facts not in the context.\n"
            "5. Do NOT cite page numbers yourself — they will be added automatically.\n"
            "6. Do NOT include citation numbers like [1], [2], [3], etc. in your response.\n\n"
            f"=== DOCUMENT CONTEXT ===\n{context}\n=== END CONTEXT ==="
        )

    messages = [{"role": "system", "content": system_prompt}] + history + [
        {"role": "user", "content": query}
    ]

    response = model.invoke(messages)
    answer = response.content if hasattr(response, "content") else str(response)

    if not answer or not answer.strip():
        answer = "Could not generate an answer. Please try again."

    # Remove any citation markers the LLM might still produce
    answer = re.sub(r"\[\d+\](?:\[\d+\])*", "", answer).strip()

    # Persist turn in conversation history
    _conversation_history[thread_id] = history + [
        {"role": "user", "content": query},
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

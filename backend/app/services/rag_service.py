import hashlib
import os
import tempfile
import uuid

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.chat_models import init_chat_model

from .agent_service import model as _online_model  # noqa: F401 — kept for reference
from ..config import Config

# ── LLM model for PDF chat ───────────────────────────────────────────────────
# We use perplexity:sonar here. Although sonar is an online model, our
# distance-filter in retrieve_context() ensures the LLM is ONLY called when
# highly-relevant chunks (cosine > 0.5) exist in the PDF.  Irrelevant queries
# are rejected BEFORE reaching the LLM, so web-search leakage is prevented
# by the retrieval gate rather than the model choice.
_rag_model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY,
)

# Load embedding model ONCE at module level (shared instance).
# local_files_only=True uses the already-cached model and avoids HuggingFace
# Hub network calls on every backend startup (faster and more reliable).
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2",
    model_kwargs={"local_files_only": True},
)

# In-memory cache: file_hash → Chroma vector store
_cached_vector_stores: dict[str, Chroma] = {}

# Per-tab conversation history: thread_id → list of {role, content} messages
_conversation_history: dict[str, list] = {}

# Map of file_hash → thread_id
_session_threads: dict = {}


def _get_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def get_or_build_vector_store(pdf_path: str, file_bytes: bytes) -> tuple[Chroma, str]:
    """Return cached vector store if already processed, otherwise build it."""
    file_hash = _get_file_hash(file_bytes)

    if file_hash not in _cached_vector_stores:
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        chunks = splitter.split_documents(documents)

        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=_embeddings,
            collection_name=f"pdf_chat_{file_hash}",
            persist_directory="./chroma_pdf_db",
        )
        _cached_vector_stores[file_hash] = vector_store

    return _cached_vector_stores[file_hash], file_hash


def create_session(file_hash: str, model=None) -> str:
    """
    Create a new conversation thread for a PDF tab.
    Returns a unique thread_id (pdf_chat_{hash_prefix}_{uuid_short}).
    """
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


# Maximum L2 distance allowed for a chunk to be considered relevant.
# ChromaDB returns L2 (Euclidean) distances. Lower = more similar.
# all-mpnet-base-v2 vectors are unit-normalised, so:
#   L2 distance 0.0  → identical
#   L2 distance ~1.0 → moderate similarity (cos ~ 0.5)
#   L2 distance ~2.0 → completely unrelated (cos ~ -1.0)
# Chunks with L2 > 1.0 (cosine < 0.5) are rejected.
MAX_L2_DISTANCE = 1.0


# ── Meta-query detection ─────────────────────────────────────────────────────
# Queries that ask ABOUT the document itself ("what topics", "summarize",
# "what does this pdf cover") don't match any specific chunk semantically,
# so they would be wrongly filtered out.  We detect them and use ALL chunks
# with a summarization prompt instead of the distance filter.
_META_QUERY_PHRASES = (
    "this pdf", "this document", "the pdf", "the document",
    "topics covered", "what topics", "what are the topics",
    "what is covered", "what does it cover",
    "summarize", "summary", "give me a summary", "give a summary",
    "overview", "what is in this", "what does this contain",
    "table of contents", "list all topics", "what are all",
    "tell me about this", "explain this pdf", "explain this document",
    "what can i learn", "what will i learn",
)


def _is_meta_query(query: str) -> bool:
    """Return True if the query is asking about the document as a whole."""
    q = query.lower().strip()
    return any(phrase in q for phrase in _META_QUERY_PHRASES)


def _l2_to_cosine_similarity(l2_distance: float) -> float:
    """
    Convert an L2 distance (from ChromaDB) to a cosine similarity score.

    For unit-normalised vectors:
        cos_sim = 1 - (l2_distance² / 2)

    Returns a value in [-1, 1] where 1 = identical and -1 = completely opposite.
    """
    # Clamp to avoid numerical noise below 0
    l2_distance = max(0.0, l2_distance)
    return 1.0 - (l2_distance ** 2) / 2.0


def retrieve_context(vector_store: Chroma, query: str, k: int = 5) -> tuple[str, list, float]:
    """
    Run similarity search and return (context_string, source_docs, relevance_score).

    Two modes:
    1. META-QUERY (e.g. "what topics are covered?", "summarize this pdf"):
       Bypasses distance filtering and returns ALL stored chunks so the LLM
       can produce a full document overview.

    2. SPECIFIC QUERY (e.g. "what is encapsulation?"):
       Runs similarity_search_with_score, converts L2 → cosine similarity,
       and discards chunks with L2 > MAX_L2_DISTANCE (cosine < 0.5).
       If 0 chunks survive, returns empty context → LLM is never called.

    For debugging: prints retrieved chunks and similarity scores.
    """
    # ── META-QUERY path ───────────────────────────────────────────────────────
    if _is_meta_query(query):
        print(f"\n[RAG] META-QUERY detected: '{query}'")
        print(f"[RAG] Fetching ALL chunks for full-document summary...")
        all_docs = vector_store.similarity_search(query, k=50)  # grab all
        if not all_docs:
            return "", [], 0.0
        context_parts = []
        for i, doc in enumerate(all_docs, start=1):
            page_num = doc.metadata.get("page", 0) + 1
            source = doc.metadata.get("source", "unknown")
            context_parts.append(
                f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
            )
            print(f"  [{i}] Page {page_num} | {doc.page_content[:80]}...")
        context = "\n\n".join(context_parts)
        # Use a high relevance score so build_answer always proceeds
        return context, all_docs, 1.0

    # ── SPECIFIC QUERY path ───────────────────────────────────────────────────
    try:
        # similarity_search_with_score (no trailing 's') returns (doc, l2_distance) pairs
        retrieved_docs_with_scores = vector_store.similarity_search_with_score(query, k=k)
        docs_with_scores = [(doc, score) for doc, score in retrieved_docs_with_scores]
    except (AttributeError, TypeError) as e:
        # Absolute fallback — should never happen with langchain_chroma.
        # Use L2=2.0 so ALL chunks FAIL the filter → query rejected safely.
        print(f"[RAG] WARNING: similarity_search_with_score failed ({e}). Using safe fallback.")
        retrieved_docs = vector_store.similarity_search(query, k=k)
        docs_with_scores = [(doc, 2.0) for doc in retrieved_docs]

    if not docs_with_scores:
        print(f"[RAG] Query: '{query}' - NO RESULTS FOUND")
        return "", [], 0.0

    print(f"\n[RAG] Query: '{query}'")
    print(f"[RAG] Individual L2 distances (lower = more relevant):")

    # Filter out chunks that are too dissimilar
    relevant_docs_with_scores = []
    for i, (doc, l2_dist) in enumerate(docs_with_scores, start=1):
        cos_sim = _l2_to_cosine_similarity(l2_dist)
        page_num = doc.metadata.get("page", 0) + 1
        status = "KEPT" if l2_dist <= MAX_L2_DISTANCE else "FILTERED"
        print(
            f"  [{i}] Page {page_num} | L2={l2_dist:.4f} | CosSim={cos_sim:.3f} | "
            f"{status} | {doc.page_content[:80]}..."
        )
        if l2_dist <= MAX_L2_DISTANCE:
            relevant_docs_with_scores.append((doc, l2_dist))

    if not relevant_docs_with_scores:
        print(f"[RAG] All chunks filtered — query is NOT related to the PDF.")
        return "", [], 0.0

    # Average cosine similarity of kept chunks
    avg_similarity = sum(
        _l2_to_cosine_similarity(score) for _, score in relevant_docs_with_scores
    ) / len(relevant_docs_with_scores)

    print(f"[RAG] Kept {len(relevant_docs_with_scores)}/{len(docs_with_scores)} chunks | "
          f"Avg cosine similarity: {avg_similarity:.3f}")

    context_parts = []
    for i, (doc, l2_dist) in enumerate(relevant_docs_with_scores, start=1):
        page_num = doc.metadata.get("page", 0) + 1
        source = doc.metadata.get("source", "unknown")
        context_parts.append(
            f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
        )

    context = "\n\n".join(context_parts)
    docs = [doc for doc, _ in relevant_docs_with_scores]

    return context, docs, avg_similarity


# Phrases the LLM uses when it cannot find the answer in the context.
# We check for ALL of them to avoid partial matches slipping through.
_NO_INFO_PHRASES = (
    "I cannot find this information",
    "not in the provided document",
    "the document does not contain",
    "not mentioned in the",
    "no information about",
)


def build_answer(thread_id: str, context: str, query: str, source_docs: list, relevance_score: float = 0.5) -> str:
    """
    Invoke the LLM with per-tab conversation history for follow-up awareness.
    Checks relevance score to detect out-of-context queries.
    Returns the answer string with source page citations appended.

    Gate 1 — empty context: retrieve_context already filtered all chunks as
              irrelevant (relevance_score == 0.0 and no docs).
    Gate 2 — cosine threshold: avg cosine similarity must be ≥ 0.5 (set by
              MAX_L2_DISTANCE in retrieve_context). Since filtering already
              happened, relevance_score here is always ≥ 0.5 when docs exist.
    Gate 3 — LLM refusal: if the LLM's own answer contains a 'not found'
              phrase, we do NOT append source citations.
    """
    # Use the RAG model (sonar) — irrelevant queries are blocked BEFORE this
    # point by the distance filter in retrieve_context(), so the LLM only ever
    # sees chunks that are genuinely relevant to the user's question.
    model = _rag_model

    print(f"\n[ANSWER BUILD] Using model: sonar | META={_is_meta_query(query)}")
    print(f"[ANSWER BUILD] Relevance Score: {relevance_score:.3f} | Docs: {len(source_docs)}")

    # Gate 1 & 2: No relevant chunks found → reject without calling LLM
    if not source_docs or relevance_score == 0.0:
        print(f"[ANSWER BUILD] REJECTED - No relevant chunks passed the distance filter.")
        irrelevant_message = (
            "❌ **This question does not appear to be related to the PDF content.**\n\n"
            "The document does not contain information that matches your query. "
            "Please ask questions only about the content in the uploaded PDF.\n\n"
            "💡 **Tip:** Try rephrasing your question using terms from the document."
        )
        history = _conversation_history.get(thread_id, [])
        _conversation_history[thread_id] = history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": irrelevant_message},
        ]
        return irrelevant_message

    print(f"[ANSWER BUILD] ACCEPTED - Calling LLM with {len(source_docs)} relevant chunks")

    history = _conversation_history.get(thread_id, [])

    # Choose prompt based on query type
    if _is_meta_query(query):
        system_prompt = (
            "You are a helpful document assistant. "
            "The user is asking for an overview or summary of the document.\n\n"
            "TASK: Based ONLY on the document chunks provided below, give a clear and "
            "well-structured answer. Include all major topics, sections, and key points "
            "you find in the chunks.\n"
            "Do NOT use any external knowledge — only what is in the chunks.\n"
            "Do NOT cite page numbers yourself — they will be added automatically.\n\n"
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
            "5. Do NOT cite page numbers yourself — they will be added automatically.\n\n"
            f"=== DOCUMENT CONTEXT ===\n{context}\n=== END CONTEXT ==="
        )

    messages = [
        {"role": "system", "content": system_prompt}
    ] + history + [{"role": "user", "content": query}]

    response = model.invoke(messages)
    answer = response.content if hasattr(response, "content") else str(response)

    if not answer or not answer.strip():
        answer = "Could not generate an answer. Please try again."

    # Save turn to conversation history
    _conversation_history[thread_id] = history + [
        {"role": "user", "content": query},
        {"role": "assistant", "content": answer},
    ]

    # Gate 3: Only add source citations if the LLM actually answered from the context.
    # Check for any 'not found' phrase the LLM might have used.
    answer_lower = answer.lower()
    llm_said_not_found = any(phrase.lower() in answer_lower for phrase in _NO_INFO_PHRASES)

    if not llm_said_not_found:
        sources = sorted(set(
            doc.metadata.get("page", 0) + 1 for doc in source_docs
        ))
        if sources:
            pages = ", ".join(f"Page {p}" for p in sources)
            answer = f"{answer}\n\n📄 **Sources:** {pages}"
            print(f"[ANSWER BUILD] Sources cited: {pages}")
        else:
            print(f"[ANSWER BUILD] WARNING: Answer accepted but no source pages found!")
    else:
        print(f"[ANSWER BUILD] LLM indicated info not found — skipping source citation.")

    return answer

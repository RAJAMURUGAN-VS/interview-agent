import hashlib
import os
import tempfile
import uuid

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Load embedding model ONCE at module level (shared instance)
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
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


def retrieve_context(vector_store: Chroma, query: str, k: int = 5) -> tuple[str, list]:
    """Run similarity search and return (context_string, source_docs)."""
    retrieved_docs = vector_store.similarity_search(query, k=k)
    context_parts = []
    for i, doc in enumerate(retrieved_docs, start=1):
        page_num = doc.metadata.get("page", 0) + 1
        source = doc.metadata.get("source", "unknown")
        context_parts.append(
            f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
        )
    return "\n\n".join(context_parts), retrieved_docs


def build_answer(thread_id: str, context: str, query: str, source_docs: list) -> str:
    """
    Invoke the LLM with per-tab conversation history for follow-up awareness.
    Returns the answer string with source page citations appended.
    """
    from .agent_service import model

    history = _conversation_history.get(thread_id, [])

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that answers questions strictly based on "
                "the provided document context. If the answer cannot be found in the "
                "context, respond with exactly: "
                "'I cannot find this information in the provided document'.\n\n"
                f"Document context:\n{context}"
            ),
        }
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

    # Append source page citations
    if "I cannot find this information in the provided document" not in answer:
        sources = sorted(set(
            doc.metadata.get("page", 0) + 1 for doc in source_docs
        ))
        if sources:
            pages = ", ".join(f"Page {p}" for p in sources)
            answer = f"{answer}\n\n📄 Sources: {pages}"

    return answer

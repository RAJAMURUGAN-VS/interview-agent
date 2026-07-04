import hashlib
import os
import tempfile
import uuid

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent

# Load embedding model ONCE at module level (shared instance)
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# In-memory cache: file_hash → Chroma vector store
_cached_vector_stores: dict[str, Chroma] = {}

# LangGraph checkpointer dedicated to PDF chat — isolated from interview feature
_pdf_chat_checkpointer = InMemorySaver()

# Map of thread_id → agent instance for PDF chat sessions
_pdf_chat_agents: dict = {}

# Map of file_hash → thread_id for the current session
_session_threads: dict = {}


def _get_file_hash(file_bytes: bytes) -> str:
    """Generate a unique hash for the uploaded file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def get_or_build_vector_store(pdf_path: str, file_bytes: bytes) -> tuple[Chroma, str]:
    """
    Return cached vector store if file was already processed,
    otherwise build and cache it.
    Returns (vector_store, file_hash).
    """
    file_hash = _get_file_hash(file_bytes)

    if file_hash not in _cached_vector_stores:
        # Load the PDF document
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        # Split into chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        chunks = splitter.split_documents(documents)

        # Embed and store in Chroma
        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=_embeddings,
            collection_name=f"pdf_chat_{file_hash}",
            persist_directory="./chroma_pdf_db",
        )

        _cached_vector_stores[file_hash] = vector_store

    return _cached_vector_stores[file_hash], file_hash


def create_session(file_hash: str, model) -> str:
    """
    Create a new LangGraph thread for a PDF session.
    Returns a unique thread_id for this session.
    Each session gets its own agent instance with the shared checkpointer.
    The thread_id format is: pdf_chat_{file_hash_prefix}_{short_uuid}
    """
    short_id = str(uuid.uuid4())[:8]
    thread_id = f"pdf_chat_{file_hash[:8]}_{short_id}"

    agent = create_agent(
        model=model,
        tools=[],
        checkpointer=_pdf_chat_checkpointer,
    )
    _pdf_chat_agents[thread_id] = agent
    _session_threads[file_hash] = thread_id
    return thread_id


def clear_session(thread_id: str) -> None:
    """
    Remove the agent and vector store for a closed tab.
    Called when the user closes a PDF tab.
    """
    _pdf_chat_agents.pop(thread_id, None)

    # Remove the vector store whose session maps to this thread
    hash_to_remove = None
    for file_hash, tid in _session_threads.items():
        if tid == thread_id:
            hash_to_remove = file_hash
            break
    if hash_to_remove:
        _cached_vector_stores.pop(hash_to_remove, None)
        _session_threads.pop(hash_to_remove, None)


def retrieve_context(vector_store: Chroma, query: str, k: int = 5) -> tuple[str, list]:
    """
    Run similarity search and format retrieved chunks into a context string.
    Returns (context_string, source_docs).
    """
    retrieved_docs = vector_store.similarity_search(query, k=k)
    context_parts = []
    for i, doc in enumerate(retrieved_docs, start=1):
        page_num = doc.metadata.get("page", 0) + 1
        source = doc.metadata.get("source", "unknown")
        context_parts.append(
            f"[Chunk {i} | Page {page_num} | Source: {source}]\n{doc.page_content}"
        )
    docs_content = "\n\n".join(context_parts)
    return docs_content, retrieved_docs


def build_answer(thread_id: str, context: str, query: str, source_docs: list) -> str:
    """
    Invoke the LangGraph agent for this thread with the retrieved context
    and user query. The agent's checkpointer maintains full conversation
    history per thread_id, so follow-up questions work correctly.
    Returns the full answer string with source page numbers appended.
    """
    agent = _pdf_chat_agents.get(thread_id)
    if not agent:
        return "Session not found. Please re-upload the PDF."

    system_message = f"""Answer ONLY using the provided context. If the answer is not present in the context, respond with: 'I cannot find this information in the provided document.'

Context: {context}"""

    config = {"configurable": {"thread_id": thread_id}}

    response = agent.invoke(
        {
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user",   "content": query},
            ]
        },
        config=config,
    )

    answer = response["messages"][-1].content

    if "I cannot find this information in the provided document" in answer:
        return answer

    sources = []
    for doc in source_docs:
        page = doc.metadata.get("page", 0) + 1
        sources.append(f"Page {page}")

    unique_sources = sorted(set(sources))
    return f"{answer}\n\n📄 Sources: {', '.join(unique_sources)}"

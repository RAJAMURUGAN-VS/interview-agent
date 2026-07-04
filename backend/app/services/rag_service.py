import hashlib
import os
import tempfile

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Load embedding model ONCE at module level (shared instance)
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# In-memory cache: session_id (hex SHA-256 digest) → Chroma vector store
_vector_store_cache: dict[str, Chroma] = {}


def build_rag_pipeline(file_bytes: bytes) -> str:
    """
    Hash file_bytes → check cache → if miss, load/embed/store → cache vector store.
    Returns session_id (hex SHA-256 digest).
    """
    # Compute SHA-256 hash of the uploaded file bytes
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Cache-hit path: return existing session_id without reprocessing
    if file_hash in _vector_store_cache:
        return file_hash

    # Save uploaded bytes to a temp file for PyPDFLoader
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            tmp_file.write(file_bytes)

        # Load the PDF document
        loader = PyPDFLoader(tmp_path)
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

        # Cache the vector store
        _vector_store_cache[file_hash] = vector_store

    finally:
        # Delete temp file regardless of success or failure
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return file_hash


def query_rag(session_id: str, question: str) -> dict:
    """
    Look up vector store by session_id, retrieve top-5 chunks via similarity search,
    build context, invoke LLM, extract source page numbers.
    Returns {"answer": str, "sources": list[int]}
    """
    # Lazy import to avoid circular imports
    from .agent_service import model

    # Look up vector store from cache; raise KeyError if not found
    if session_id not in _vector_store_cache:
        raise KeyError(f"Session '{session_id}' not found. Please upload a PDF first.")

    vector_store = _vector_store_cache[session_id]

    # Retrieve top-5 most relevant chunks
    chunks = vector_store.similarity_search(question, k=5)

    # Build context string from retrieved chunks (include source metadata)
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        page_num = chunk.metadata.get("page", 0) + 1  # PyPDFLoader is 0-indexed
        source = chunk.metadata.get("source", "unknown")
        context_parts.append(
            f"[Chunk {i} | Page {page_num} | Source: {source}]\n{chunk.page_content}"
        )
    context = "\n\n".join(context_parts)

    # Extract unique 1-indexed page numbers from chunk metadata
    sources = sorted(
        set(chunk.metadata.get("page", 0) + 1 for chunk in chunks)
    )

    # Build the prompt
    system_prompt = (
        "You are a helpful assistant that answers questions strictly based on the provided document context. "
        "If the answer cannot be found in the context, respond with exactly: "
        "'I cannot find this information in the provided document'. "
        "Always reference the relevant page numbers when providing an answer."
    )

    user_message = (
        f"Context from the document:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        f"Answer based only on the context above. "
        f"The relevant content comes from page(s): {', '.join(str(p) for p in sources)}."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # Invoke the shared LLM model
    response = model.invoke(messages)

    # Extract answer text from the response
    if hasattr(response, "content"):
        answer = response.content
    else:
        answer = str(response)

    if not answer or not answer.strip():
        answer = "Could not generate an answer. Please try again."
        sources = []

    return {"answer": answer, "sources": sources}

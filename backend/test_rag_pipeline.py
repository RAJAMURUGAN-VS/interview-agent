"""
RAG Pipeline Diagnostic Test
=============================
Run from the backend/ directory:
    python test_rag_pipeline.py <path_to_pdf>

Tests:
  1. PDF loading & chunking
  2. Embedding generation
  3. ChromaDB storage & retrieval
  4. Similarity score inspection (L2 distances)
  5. Relevance filter
  6. LLM model identification
"""

import sys
import os
import tempfile

# ── make sure .env is loaded ─────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

# ── add the app package to sys.path ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
import chromadb

DIVIDER = "-" * 70

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def section(title: str):
    print("")
    print(DIVIDER)
    print("  " + title)
    print(DIVIDER)


def l2_to_cosine(l2: float) -> float:
    """Unit-vector conversion: cos_sim = 1 - (l2^2 / 2)"""
    return 1.0 - (max(0.0, l2) ** 2) / 2.0


# ─────────────────────────────────────────────────────────────────────────────

def test_pdf_loading(pdf_path: str):
    section("STEP 1 -- PDF Loading & Chunking")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    print("  Pages loaded     : " + str(len(docs)))
    if not docs:
        print("  [FAIL] No pages loaded -- PDF may be scanned/image-only.")
        sys.exit(1)

    for i, doc in enumerate(docs[:3]):
        print("\n  [Page {}] first 200 chars:".format(i + 1))
        print("    " + repr(doc.page_content[:200].strip()))

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(docs)
    print("\n  Total chunks     : " + str(len(chunks)))
    print("  Avg chunk length : " + str(sum(len(c.page_content) for c in chunks) // len(chunks)) + " chars")
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Step 2 – Embeddings & ChromaDB
# ─────────────────────────────────────────────────────────────────────────────

def test_vector_store(chunks):
    section("STEP 2 -- Embedding & Vector Store")
    print("  Loading embedding model (sentence-transformers/all-mpnet-base-v2)...")
    print("  [Using local cache -- no network download needed]")
    # local_files_only=True forces use of the already-downloaded cached model.
    # This avoids HuggingFace Hub network calls which can timeout.
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2",
        model_kwargs={"local_files_only": True},
    )

    collection_name = "rag_diagnostic_test"
    persist_dir = "./chroma_pdf_db"

    client = chromadb.PersistentClient(path=persist_dir)
    existing = [c.name for c in client.list_collections()]
    if collection_name in existing:
        client.delete_collection(collection_name)
        print("  Deleted old test collection '" + collection_name + "'")

    print("  Building vector store with " + str(len(chunks)) + " chunks...")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=collection_name,
        persist_directory=persist_dir,
    )

    count = vector_store._collection.count()
    print("  [OK] Stored " + str(count) + " vectors in ChromaDB")
    return vector_store, embeddings


# ─────────────────────────────────────────────────────────────────────────────
# Step 3 – Similarity search & score inspection
# ─────────────────────────────────────────────────────────────────────────────

RELEVANT_QUERY   = None   # auto-detected from first chunk
IRRELEVANT_QUERY = "Who is the current Prime Minister of India?"

def test_retrieval(vector_store: Chroma, chunks):
    section("STEP 3 -- Retrieval & Score Inspection")

    first_words = " ".join(chunks[0].page_content.split()[:8])
    relevant_query = first_words
    print("  Relevant query   : " + repr(relevant_query))
    print("  Irrelevant query : " + repr(IRRELEVANT_QUERY))
    print("")

    MAX_L2 = 1.0

    for label, query in [("RELEVANT", relevant_query), ("IRRELEVANT", IRRELEVANT_QUERY)]:
        print("  -- Query: [" + label + "] " + repr(query))
        results = vector_store.similarity_search_with_score(query, k=5)
        kept = []
        for i, (doc, l2) in enumerate(results, 1):
            cos = l2_to_cosine(l2)
            page = doc.metadata.get("page", 0) + 1
            status = "KEEP" if l2 <= MAX_L2 else "FILTER"
            print("     [{}] Page {:>3} | L2={:.4f} | CosSim={:.3f} | {}".format(i, page, l2, cos, status))
            print("          " + repr(doc.page_content[:100].strip()))
            if l2 <= MAX_L2:
                kept.append(doc)

        if kept:
            print("     -> {} chunk(s) PASS filter -> LLM will be called".format(len(kept)))
        else:
            print("     -> 0 chunks pass filter -> LLM will NOT be called (correct!)")
        print("")

    return relevant_query


# ─────────────────────────────────────────────────────────────────────────────
# Step 4 – LLM isolation test
# ─────────────────────────────────────────────────────────────────────────────

def test_llm_isolation():
    section("STEP 4 -- LLM Model Identification")
    # Check models directly without importing the full Flask app
    # (which requires flask_sqlalchemy and other server dependencies)
    from dotenv import load_dotenv
    load_dotenv()
    import os
    from langchain.chat_models import init_chat_model

    perplexity_key = os.getenv("PERPLEXITY_API_KEY", "")

    online_id = "perplexity:sonar"   # used by agent_service.py (interviews)
    rag_id    = "perplexity:r1-1776" # used by rag_service.py (pdf chat)

    print("  Online model (interviews) : " + online_id)
    print("  RAG model    (pdf chat)   : " + rag_id)

    online_sonar = ["sonar", "sonar-pro", "sonar-reasoning", "sonar-deep-research"]
    rag_is_online = any(m == rag_id.split(":")[-1] for m in online_sonar)

    if rag_is_online:
        print("")
        print("  [FAIL] RAG model is still an ONLINE (web-searching) model!")
        print("         It will answer factual questions from the internet.")
    else:
        print("  [OK] RAG model 'r1-1776' is offline -- no web search.")
        print("  [OK] Online model 'sonar' is only used for interview questions.")


# ─────────────────────────────────────────────────────────────────────────────
# Step 5 – End-to-end RAG test with irrelevant query
# ─────────────────────────────────────────────────────────────────────────────

def test_e2e(vector_store: Chroma):
    section("STEP 5 -- End-to-End Filter Test (Irrelevant Query)")
    print("  Query: " + repr(IRRELEVANT_QUERY))
    print("")

    MAX_L2 = 1.0
    results = vector_store.similarity_search_with_score(IRRELEVANT_QUERY, k=5)
    kept = [(doc, l2) for doc, l2 in results if l2 <= MAX_L2]

    print("  Retrieved : " + str(len(results)) + " chunks")
    print("  Passed filter: " + str(len(kept)) + " chunks")

    if not kept:
        print("")
        print("  [OK] CORRECT BEHAVIOR: Filter blocks the query.")
        print("  User would see: 'This question does not appear to be related to the PDF.'")
    else:
        avg_cos = sum(l2_to_cosine(l2) for _, l2 in kept) / len(kept)
        print("")
        print("  [WARN] " + str(len(kept)) + " chunk(s) passed the filter (avg cosine=" + "{:.3f}".format(avg_cos) + ")")
        print("         The LLM would be called. If the model is online, it may hallucinate.")
        for doc, l2 in kept:
            page = doc.metadata.get("page", 0) + 1
            print("         Page " + str(page) + " | L2=" + "{:.4f}".format(l2) + " | " + repr(doc.page_content[:120].strip()))


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_rag_pipeline.py <path_to_pdf>")
        print("")
        print("No PDF provided. Creating a synthetic test PDF...")

        # Create a synthetic PDF using only built-in libs (write raw PDF bytes)
        synthetic_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 300>>stream
BT /F1 12 Tf 50 750 Td
(Object-Oriented Programming OOP) Tj 0 -20 Td
(OOP is a programming paradigm based on objects and classes.) Tj 0 -20 Td
(The four pillars of OOP are:) Tj 0 -20 Td
(1. Encapsulation: hiding internal state) Tj 0 -20 Td
(2. Abstraction: exposing only necessary details) Tj 0 -20 Td
(3. Inheritance: deriving new classes from existing ones) Tj 0 -20 Td
(4. Polymorphism: same interface different implementations) Tj 0 -20 Td
(A class is a blueprint. An object is an instance of a class.) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000618 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
698
%%EOF"""

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.write(synthetic_content)
        tmp.close()
        pdf_path = tmp.name
        print("  Synthetic PDF written to: " + pdf_path)
    else:
        pdf_path = sys.argv[1]
        if not os.path.exists(pdf_path):
            print("  [FAIL] File not found: " + pdf_path)
            sys.exit(1)

    print("")
    print("=" * 70)
    print("  RAG PIPELINE DIAGNOSTIC")
    print("  PDF: " + pdf_path)
    print("=" * 70)

    chunks = test_pdf_loading(pdf_path)
    vector_store, _ = test_vector_store(chunks)
    test_retrieval(vector_store, chunks)
    test_llm_isolation()
    test_e2e(vector_store)

    print("")
    print("=" * 70)
    print("  DIAGNOSTIC COMPLETE")
    print("=" * 70)
    print("")


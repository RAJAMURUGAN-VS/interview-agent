# Design Document: PDF Chat Feature

## Overview

The PDF Chat feature adds a RAG (Retrieval-Augmented Generation) pipeline to the PlacementPrep AI application, allowing users to upload any PDF document and ask questions about its content. Questions can be submitted via typed text or voice, and answers are grounded in the document content with source page citations.

The feature integrates cleanly with the existing Flask/React architecture: a new `pdf_chat` blueprint joins the existing `interview` and `feedback` blueprints on the backend, and a new `PdfChatPage` with route `/pdf-chat` joins the existing pages on the frontend. All three existing services (LLM via `agent_service`, STT via `stt_service`, TTS via `tts_service`) are reused without modification.

### Key Design Decisions

- **Hash-based session ID**: The SHA-256 hash of the uploaded file binary is used as the session identifier. This makes caching automatic — uploading the same file twice reuses the existing vector store at zero cost.
- **Chroma persistence**: Vector stores are persisted to disk (`./chroma_pdf_db`) so embeddings survive backend restarts.
- **In-band answer header for speech**: The TTS response streams audio in the body while the answer text is delivered in the `X-Answer-Text` response header, matching the pattern already used in the interview route (`X-Question-Number`, `X-Interview-Complete`).
- **Mode toggle without history loss**: Chat history lives in the `usePdfChat` hook state, not in a mode-specific store, so switching modes never clears it.

---

## Architecture

The feature follows the same three-layer architecture already present in the codebase:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React/TypeScript)                                │
│                                                             │
│  PdfChatPage                                                │
│  ├── UploadArea      ← file input, calls /pdf-chat/upload   │
│  ├── ModeToggle      ← switches text / speech               │
│  └── ChatWindow                                             │
│      └── ChatMessage (x N)  ← answer + citations           │
│                                                             │
│  usePdfChat (hook)  ← state + API calls                     │
│  pdfChatApi.ts      ← fetch wrappers                        │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────────────────────┐
│  Backend (Flask/Python)                                     │
│                                                             │
│  app/__init__.py  ← registers pdf_chat blueprint,           │
│                     adds X-Answer-Text to CORS              │
│                                                             │
│  routes/pdf_chat.py  (new Blueprint)                        │
│  ├── POST /pdf-chat/upload                                  │
│  ├── POST /pdf-chat/ask-text                                │
│  └── POST /pdf-chat/ask-speech                              │
│                                                             │
│  services/rag_service.py  (new)                             │
│  ├── build_rag_pipeline(file_bytes) → session_id            │
│  └── query_rag(session_id, question) → {answer, sources}    │
│                                                             │
│  Existing services (unchanged):                             │
│  ├── agent_service.py  (model instance reused)              │
│  ├── stt_service.py    (speech_to_text reused)              │
│  └── tts_service.py    (stream_audio reused)                │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Storage                                                    │
│  ./chroma_pdf_db/  ← Chroma persisted vector store         │
└─────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

```
Upload request
     │
     ▼
Compute SHA-256 hash ──► Cache hit? ──► Return cached session_id
     │ (miss)
     ▼
Save to temp file
     │
     ▼
PyPDFLoader → Document list
     │
     ▼
RecursiveCharacterTextSplitter (chunk_size=1000, chunk_overlap=200)
     │
     ▼
HuggingFaceEmbeddings (sentence-transformers/all-mpnet-base-v2)
     │
     ▼
Chroma.from_documents(collection_name="pdf_chat_collection",
                      persist_directory="./chroma_pdf_db")
     │
     ▼
Store retriever in session cache keyed by hash
     │
     ▼
Return session_id (= hash)
```

---

## Components and Interfaces

### Backend

#### `services/rag_service.py`

```python
# In-memory cache: session_id (hash) → Chroma retriever
_retriever_cache: dict[str, VectorStoreRetriever] = {}

def build_rag_pipeline(file_bytes: bytes) -> str:
    """
    Hash file_bytes → check cache → if miss, load/embed/store → cache retriever.
    Returns session_id (hex SHA-256 digest).
    """

def query_rag(session_id: str, question: str) -> dict:
    """
    Retrieve top-5 chunks from the cached retriever, invoke LLM with context,
    extract source page numbers.
    Returns {"answer": str, "sources": list[int]}
    """
```

The module imports `model` from `agent_service` for LLM inference. It does **not** create a new model instance.

#### `routes/pdf_chat.py`

Three endpoints on the `pdf_chat` Blueprint (prefix `/pdf-chat`):

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/pdf-chat/upload` | POST | `multipart/form-data` — field `pdf` | `{"session_id": "<hex>"}` |
| `/pdf-chat/ask-text` | POST | JSON `{"session_id": "…", "question": "…"}` | `{"answer": "…", "sources": [1, 3, 7]}` |
| `/pdf-chat/ask-speech` | POST | `multipart/form-data` — fields `audio`, `session_id` | Streaming audio body + `X-Answer-Text` header |

Error responses use standard JSON `{"error": "<message>"}` with appropriate HTTP status codes (400 for invalid input, 500 for processing failures).

#### `app/__init__.py` changes

```python
CORS(app, expose_headers=[
    'X-Question-Number', 'X-Interview-Complete', 'X-Answer-Text'  # added
])
from .routes import interview, feedback, pdf_chat   # added pdf_chat
app.register_blueprint(pdf_chat.bp)                 # added
```

### Frontend

#### New files

| File | Purpose |
|---|---|
| `src/pages/PdfChatPage.tsx` | Route container, composes UploadArea + ChatWindow |
| `src/components/pdf-chat/UploadArea.tsx` | Drag-and-drop / file input, upload progress |
| `src/components/pdf-chat/ChatWindow.tsx` | Scrollable message list + mode-specific input |
| `src/components/pdf-chat/ChatMessage.tsx` | Single message bubble with optional citation badges |
| `src/components/pdf-chat/ModeToggle.tsx` | Text / Speech segmented control |
| `src/hooks/usePdfChat.ts` | All PDF chat state and API orchestration |
| `src/api/pdfChatApi.ts` | Typed fetch wrappers for the three endpoints |

#### Modified files

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'pdf-chat'` to `AppTab` union; add `ChatMode`, `ChatMessage`, `UploadResponse`, `AskTextResponse` types |
| `src/App.tsx` | Add `<Route path="/pdf-chat" element={<PdfChatPage />} />` |
| `src/components/layout/NavBar.tsx` | Add PDF Chat `<NavLink to="/pdf-chat">` |

---

## Data Models

### Backend

```python
# Returned by query_rag()
@dataclass
class RagAnswer:
    answer: str
    sources: list[int]  # unique page numbers, 1-indexed
```

### Frontend TypeScript types

```typescript
// src/types/index.ts additions

export type AppTab = 'interview' | 'notes' | 'pdf-chat';

export type ChatMode = 'text' | 'speech';

export interface ChatMessage {
  id: string;            // crypto.randomUUID()
  role: 'user' | 'assistant';
  text: string;
  sources?: number[];    // page numbers, only on assistant messages
  audioUrl?: string;     // object URL for played-back audio, optional
}

export interface UploadResponse {
  session_id: string;
}

export interface AskTextResponse {
  answer: string;
  sources: number[];
}
```

### `usePdfChat` hook state shape

```typescript
interface PdfChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  mode: ChatMode;
  isUploading: boolean;
  isAsking: boolean;
  uploadError: string | null;
  askError: string | null;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File hash idempotence and cache hit

*For any* PDF file content, hashing that content twice must produce the same session ID, and calling `build_rag_pipeline` with the same bytes twice must return the same session ID without creating a second vector store entry.

**Validates: Requirements 1.3, 1.8**

### Property 2: Source page extraction completeness

*For any* list of retrieved document chunks that each carry a `page` metadata field, the sources returned by `query_rag` must be exactly the set of unique page numbers present in those chunks — no page omitted, no phantom page added.

**Validates: Requirements 2.7, 2.8**

### Property 3: Answer rendering includes citations

*For any* assistant `ChatMessage` that has a non-empty `sources` array, the rendered `ChatMessage` component must display a citation indicator for every page number in that array.

**Validates: Requirements 2.9, 3.9**

### Property 4: X-Answer-Text header matches generated answer

*For any* speech question that results in a generated answer text, the value of the `X-Answer-Text` response header must equal the exact answer text that was passed to the TTS service.

**Validates: Requirements 3.8**

### Property 5: Mode switching preserves chat history

*For any* sequence of chat messages accumulated in `usePdfChat`, switching the `ChatMode` (text → speech or speech → text, any number of times) must leave the `messages` array unchanged in content and order.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 6: Mode selection shows correct input control

*For any* `ChatMode` value, the `ChatWindow` must render exactly the input control associated with that mode (text input + send button for `'text'`; microphone button for `'speech'`) and must not render the other mode's control simultaneously.

**Validates: Requirements 4.5, 3.1**

### Property 7: New PDF upload resets chat history

*For any* non-empty chat history, successfully uploading a new PDF (via `build_rag_pipeline` followed by the upload response handler in `usePdfChat`) must result in an empty `messages` array and mode reset to `'text'`.

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 8: Temporary file cleanup on success and failure

*For any* upload, STT, or TTS operation that writes a temporary file, that file must not exist on disk after the operation completes — regardless of whether the operation succeeded or raised an exception.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

---

## Error Handling

### Backend

| Scenario | Behavior |
|---|---|
| Non-PDF or corrupt file uploaded | 400 `{"error": "Invalid or unreadable PDF file"}` |
| `session_id` not found in cache | 400 `{"error": "Session not found. Please upload a PDF first."}` |
| Empty / blank question | 400 `{"error": "Question must not be empty"}` |
| LLM returns empty response | Return `{"answer": "Could not generate an answer. Please try again.", "sources": []}` |
| Any unhandled exception | 500 `{"error": "<exception message>"}` + temp-file cleanup in `finally` |
| STT returns empty transcript | Fall back to a graceful `{"error": "Could not transcribe audio. Please try again."}` |

### Frontend

| Scenario | Behavior |
|---|---|
| Upload fails | Show inline error below UploadArea, allow retry |
| Ask-text/ask-speech fails | Show error below the user's message bubble; keep chat history intact |
| No session (ask attempted before upload) | Disabled submit controls (gated by `sessionId !== null`) |
| Audio playback error | Degrade gracefully: show answer text only, suppress audio error to console |

---

## Testing Strategy

### Unit Tests (example-based)

**Backend** (pytest):
- `rag_service`: mock `PyPDFLoader`, `RecursiveCharacterTextSplitter`, `HuggingFaceEmbeddings`, `Chroma` — verify each is instantiated with the correct arguments (covers smoke-level configuration checks)
- Routes: use Flask test client to verify request/response shapes, status codes, and header presence
- Resource cleanup: mock `os.unlink` and simulate exceptions, verify it is called in all code paths

**Frontend** (Vitest + React Testing Library):
- `PdfChatPage`: renders UploadArea; after simulated successful upload renders ChatWindow
- `ChatMessage`: renders `sources` citation badges for each page number
- `ModeToggle`: clicking each option emits the correct mode value
- `usePdfChat`: verify initial state defaults (mode=`'text'`, empty messages)
- `NavBar`: renders the PDF Chat NavLink

### Property-Based Tests

The project uses **Hypothesis** on the backend and **fast-check** on the frontend.

Each property test runs a minimum of **100 iterations**.

Tests are tagged with comments in the format:  
`# Feature: pdf-chat, Property <N>: <property_text>`  
(backend) or  
`// Feature: pdf-chat, Property <N>: <property_text>`  
(frontend)

| Property | Test location | What is generated |
|---|---|---|
| P1 — Hash idempotence | `tests/test_rag_service.py` | Random byte sequences representing file contents |
| P2 — Source extraction | `tests/test_rag_service.py` | Lists of mock `Document` objects with random `metadata.page` values |
| P3 — Citation rendering | `src/components/pdf-chat/__tests__/ChatMessage.test.tsx` | Random `ChatMessage` objects with varying `sources` arrays |
| P4 — X-Answer-Text header | `tests/test_pdf_chat_routes.py` | Random answer strings (unicode, punctuation, long text) |
| P5 — Mode switch preserves history | `src/hooks/__tests__/usePdfChat.test.ts` | Random arrays of `ChatMessage`, random sequences of mode switches |
| P6 — Correct input control per mode | `src/components/pdf-chat/__tests__/ChatWindow.test.tsx` | Random `ChatMode` value drawn from `['text', 'speech']` |
| P7 — New upload resets history | `src/hooks/__tests__/usePdfChat.test.ts` | Random non-empty `ChatMessage` arrays, new session IDs |
| P8 — Temp file cleanup | `tests/test_resource_cleanup.py` | Random processing outcomes (success / various exceptions) |

### Integration Tests

The following are verified with a small number of concrete examples against a live or mocked backend:

- End-to-end upload → ask-text cycle with a real small PDF
- Speech path: audio blob → STT mock → RAG → TTS mock → streaming response
- CORS headers include `X-Answer-Text` in the actual Flask response
- `pdf_chat` blueprint is registered and all three routes return non-404

### Not Tested Automatically

- LLM response latency (10 s / 15 s SLA) — manual / load testing
- Visual appearance of citation badges — visual regression testing if needed
- AssemblyAI and Murf network latency — outside our code boundary

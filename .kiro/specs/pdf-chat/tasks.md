# Implementation Plan: PDF Chat Feature

## Overview

Add a RAG-powered PDF Chat feature to the MENTRA AI application. The backend is Python/Flask with a new `rag_service.py` and `pdf_chat` blueprint. The frontend is TypeScript/React following the existing React Router v6 and component patterns. Existing services (`agent_service`, `stt_service`, `tts_service`) are reused without modification.

## Tasks

- [x] 1. Add backend dependencies
  - [x] 1.1 Update `backend/requirements.txt` with RAG dependencies
    - Add `langchain-community`, `langchain-huggingface`, `langchain-chroma`, `chromadb`, `pypdf`, `sentence-transformers`
    - Preserve all existing dependencies
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 2. Implement the RAG service
  - [x] 2.1 Create `backend/app/services/rag_service.py` with `build_rag_pipeline`
    - Implement SHA-256 file hash computation
    - Implement in-memory `_retriever_cache` dict keyed by hash
    - Implement cache-hit path that returns existing session_id without reprocessing
    - Save uploaded bytes to a temp file, load with `PyPDFLoader`
    - Split with `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`
    - Embed with `HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")`
    - Persist to `Chroma` with `collection_name="pdf_chat_collection"`, `persist_directory="./chroma_pdf_db"`
    - Cache the retriever and return session_id (hex SHA-256 digest)
    - Delete temp file in a `finally` block regardless of success or failure
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 7.1–7.6, 9.1, 9.4, 9.5_

  - [ ]* 2.2 Write property test for hash idempotence and cache hit (Property 1)
    - **Property 1: File hash idempotence and cache hit**
    - **Validates: Requirements 1.3, 1.8**
    - Use Hypothesis to generate random byte sequences
    - Assert `build_rag_pipeline(bytes)` returns the same session_id on second call and does not create a duplicate vector store entry
    - Tag: `# Feature: pdf-chat, Property 1: hash idempotence and cache hit`

  - [x] 2.3 Implement `query_rag` in `rag_service.py`
    - Look up retriever from `_retriever_cache` by session_id; raise `KeyError` if not found
    - Call `retriever.invoke(question)` with `k=5`
    - Build prompt with retrieved chunks as context; import and call `model` from `agent_service`
    - Instruct LLM to answer only from context, state when info not found, include page numbers
    - Extract unique 1-indexed page numbers from chunk metadata
    - Return `{"answer": str, "sources": list[int]}`
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 7.6, 7.7, 8.1–8.4, 13.3, 13.4, 13.5_

  - [ ]* 2.4 Write property test for source page extraction completeness (Property 2)
    - **Property 2: Source page extraction completeness**
    - **Validates: Requirements 2.7, 2.8**
    - Use Hypothesis to generate lists of mock `Document` objects with random `metadata["page"]` values
    - Assert returned `sources` equals exactly the set of unique page numbers in the mock chunks
    - Tag: `# Feature: pdf-chat, Property 2: source page extraction completeness`

- [x] 3. Checkpoint — Ensure RAG service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the `pdf_chat` Flask blueprint
  - [x] 4.1 Create `backend/app/routes/pdf_chat.py` with `POST /pdf-chat/upload`
    - Define `Blueprint("pdf_chat", __name__, url_prefix="/pdf-chat")`
    - Accept `multipart/form-data` with field `pdf`; validate file presence and `.pdf` extension
    - Call `build_rag_pipeline(file.read())`; return `{"session_id": "<hex>"}` on success
    - Return `{"error": "..."}` with 400 for invalid input, 500 for unhandled exceptions
    - _Requirements: 1.2, 1.9, 1.11, 10.1, 10.2_

  - [x] 4.2 Add `POST /pdf-chat/ask-text` endpoint to `pdf_chat.py`
    - Accept JSON body `{"session_id": "...", "question": "..."}`
    - Validate both fields are present and question is non-empty
    - Call `query_rag(session_id, question)`; return `{"answer": "...", "sources": [...]}`
    - Handle missing session_id (400), empty question (400), unhandled exceptions (500)
    - _Requirements: 2.2, 2.8, 10.3, 10.4_

  - [x] 4.3 Add `POST /pdf-chat/ask-speech` endpoint to `pdf_chat.py`
    - Accept `multipart/form-data` with fields `audio` and `session_id`
    - Save audio to temp file; call `speech_to_text` from `stt_service`; delete temp in `finally`
    - Call `query_rag(session_id, transcript)` to get answer and sources
    - Call `stream_audio` from `tts_service` and collect audio bytes
    - Stream audio bytes in response body; set `X-Answer-Text` header to the answer text
    - Delete TTS audio temp file in `finally`
    - Handle empty STT transcript gracefully
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 10.5, 10.6, 10.7, 9.2, 9.3, 13.1, 13.2_

  - [ ]* 4.4 Write property test for X-Answer-Text header matches answer (Property 4)
    - **Property 4: X-Answer-Text header matches generated answer**
    - **Validates: Requirements 3.8**
    - Use Hypothesis to generate random answer strings (unicode, punctuation, long text)
    - Mock `query_rag` and `stream_audio`; assert `X-Answer-Text` header equals the answer text passed to TTS
    - Tag: `# Feature: pdf-chat, Property 4: X-Answer-Text header matches generated answer`

  - [ ]* 4.5 Write property test for temporary file cleanup on success and failure (Property 8)
    - **Property 8: Temporary file cleanup on success and failure**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
    - Use Hypothesis to generate random processing outcomes (success / various exceptions)
    - Mock `os.unlink`; verify it is called in all code paths including exception paths
    - Tag: `# Feature: pdf-chat, Property 8: temporary file cleanup on success and failure`

- [ ] 5. Register the blueprint and update CORS
  - [-] 5.1 Update `backend/app/__init__.py`
    - Add `X-Answer-Text` to the `expose_headers` list in the `CORS(...)` call
    - Import `pdf_chat` from `.routes` and call `app.register_blueprint(pdf_chat.bp)`
    - _Requirements: 10.8, 10.9_

- [~] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add frontend types
  - [x] 7.1 Update `frontend/src/types/index.ts` with PDF Chat types
    - Extend `AppTab` union to `'interview' | 'notes' | 'pdf-chat'`
    - Add `ChatMode = 'text' | 'speech'`
    - Add `ChatMessage` interface with `id`, `role`, `text`, `sources?`, `audioUrl?`
    - Add `UploadResponse` and `AskTextResponse` interfaces
    - _Requirements: 12.8, 12.9_

- [x] 8. Implement the frontend API module
  - [x] 8.1 Create `frontend/src/api/pdfChatApi.ts`
    - Write `uploadPdf(file: File): Promise<UploadResponse>` — POST to `/pdf-chat/upload` as `multipart/form-data`
    - Write `askText(sessionId: string, question: string): Promise<AskTextResponse>` — POST to `/pdf-chat/ask-text`
    - Write `askSpeech(sessionId: string, audioBlob: Blob): Promise<Response>` — POST to `/pdf-chat/ask-speech`, return raw `Response` for streaming
    - _Requirements: 10.1, 10.3, 10.5, 12.7_

- [x] 9. Implement the `usePdfChat` hook
  - [x] 9.1 Create `frontend/src/hooks/usePdfChat.ts`
    - Define state shape: `sessionId`, `messages`, `mode`, `isUploading`, `isAsking`, `uploadError`, `askError`
    - Implement `uploadPdf(file)`: call `pdfChatApi.uploadPdf`, set `sessionId`, clear messages and errors, reset mode to `'text'`
    - Implement `sendText(question)`: append user message, call `pdfChatApi.askText`, append assistant message with sources
    - Implement `sendSpeech(audioBlob)`: append user transcription placeholder, call `pdfChatApi.askSpeech`, read `X-Answer-Text` header, play audio via `useAudioStream`, append assistant message
    - Implement `setMode(mode)`: update mode without touching messages (preserves history)
    - Gate `sendText`/`sendSpeech` on `sessionId !== null`
    - _Requirements: 3.9, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5, 12.6, 13.5_

  - [ ]* 9.2 Write property test for mode switching preserves history (Property 5)
    - **Property 5: Mode switching preserves chat history**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - Use fast-check to generate random `ChatMessage` arrays and random sequences of mode switches
    - Assert `messages` array is unchanged in content and order after any number of mode switches
    - Tag: `// Feature: pdf-chat, Property 5: mode switching preserves chat history`

  - [ ]* 9.3 Write property test for new PDF upload resets history (Property 7)
    - **Property 7: New PDF upload resets chat history**
    - **Validates: Requirements 5.3, 5.4, 5.5**
    - Use fast-check to generate random non-empty `ChatMessage` arrays and new session IDs
    - Mock `uploadPdf` API call; assert `messages` is empty and `mode` is `'text'` after successful upload
    - Tag: `// Feature: pdf-chat, Property 7: new PDF upload resets chat history`

- [ ] 10. Implement frontend UI components
  - [x] 10.1 Create `frontend/src/components/pdfchat/ModeToggle.tsx`
    - Render a segmented Text / Speech control
    - Accept `mode: ChatMode` and `onChange: (mode: ChatMode) => void` props
    - Apply active/idle styling matching the existing NavBar active/idle pattern
    - _Requirements: 4.1, 4.5, 12.5_

  - [x] 10.2 Create `frontend/src/components/pdfchat/ChatMessage.tsx`
    - Accept a `ChatMessage` prop; render user and assistant bubbles with distinct styles
    - For assistant messages with non-empty `sources`, render a citation badge per page number
    - _Requirements: 2.9, 3.9, 12.4_

  - [ ]* 10.3 Write property test for citation rendering completeness (Property 3)
    - **Property 3: Answer rendering includes citations**
    - **Validates: Requirements 2.9, 3.9**
    - Use fast-check to generate random `ChatMessage` objects with varying `sources` arrays
    - Assert the rendered `ChatMessage` displays a citation element for every page number in `sources`
    - Tag: `// Feature: pdf-chat, Property 3: answer rendering includes citations`

  - [-] 10.4 Create `frontend/src/components/pdfchat/UploadArea.tsx`
    - Render a file input (accept `.pdf` only) and upload button
    - Show upload progress / spinner while `isUploading` is true
    - Show inline error message when `uploadError` is non-null
    - Call `onUpload(file)` prop on file selection and submission
    - Remain visible during active chat session (do not hide after upload)
    - _Requirements: 1.1, 1.2, 5.1, 12.2_

  - [ ] 10.5 Create `frontend/src/components/pdfchat/ChatWindow.tsx`
    - Render scrollable list of `ChatMessage` components
    - Render `ModeToggle` at the top of the chat window
    - In `'text'` mode: render a text input and send button; disable when `isAsking` or `sessionId` is null
    - In `'speech'` mode: render `RecordButton`-style microphone button reusing `useMediaRecorder`; auto-submit on stop
    - Render only the active mode's input control (not both simultaneously)
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 4.5, 12.3_

  - [ ]* 10.6 Write property test for correct input control per mode (Property 6)
    - **Property 6: Correct input control per mode**
    - **Validates: Requirements 4.5, 3.1**
    - Use fast-check to draw a random `ChatMode` value from `['text', 'speech']`
    - Assert `ChatWindow` renders the expected control and does not render the other mode's control
    - Tag: `// Feature: pdf-chat, Property 6: correct input control per mode`

- [ ] 11. Implement the PdfChatPage and wire routing
  - [~] 11.1 Create `frontend/src/pages/PdfChatPage.tsx`
    - Compose `UploadArea` + `ChatWindow` using `usePdfChat` hook
    - Pass `sessionId` to `ChatWindow` so input controls are gated properly
    - Match layout and spacing of existing `InterviewPage`
    - _Requirements: 1.10, 2.1, 5.2, 12.1, 12.10_

  - [~] 11.2 Add `/pdf-chat` route in `frontend/src/App.tsx`
    - Import `PdfChatPage`
    - Add `<Route path="/pdf-chat" element={<PdfChatPage />} />` inside the existing `<Routes>`
    - _Requirements: 6.2, 6.4, 12.10_

  - [~] 11.3 Add PDF Chat `NavLink` in `frontend/src/components/layout/NavBar.tsx`
    - Add a `<NavLink to="/pdf-chat">` entry with a suitable Font Awesome icon
    - Apply the same `activeClass` / `idleClass` pattern used by the Interview and Notes links
    - _Requirements: 6.1, 6.3, 6.4_

- [~] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Backend is Python; frontend is TypeScript following the existing React/Vite project
- Reuse `useAudioStream` and `useMediaRecorder` hooks from the interview feature — do not re-implement them
- The `model` variable from `agent_service.py` must be imported and reused; do not create a new LLM instance
- Frontend components live in `frontend/src/components/pdfchat/` (no hyphen) and the page in `frontend/src/pages/PdfChatPage.tsx`
- Chroma DB is persisted to `./chroma_pdf_db` relative to where Flask is run (the `backend/` folder)
- Property tests use **Hypothesis** on the backend and **fast-check** on the frontend, minimum 100 iterations each

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1"] },
    { "id": 1, "tasks": ["2.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1", "9.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "9.2", "9.3", "10.1", "10.2"] },
    { "id": 5, "tasks": ["4.4", "4.5", "5.1", "10.3", "10.4", "10.5"] },
    { "id": 6, "tasks": ["10.6", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3"] }
  ]
}
```

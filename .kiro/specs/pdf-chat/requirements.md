# Requirements Document

## Introduction

This document specifies the requirements for the PDF Chat feature in the MENTRA AI application. PDF Chat enables users to upload PDF documents and interact with them through a conversational interface using Retrieval-Augmented Generation (RAG). Users can ask questions about the PDF content in either text or speech mode, with answers generated from the document context and accompanied by source page references.

## Glossary

- **PDF_Chat_System**: The complete PDF Chat feature including upload, processing, and chat capabilities
- **RAG_Pipeline**: The backend system that processes PDFs through loading, chunking, embedding, and retrieval stages
- **Chat_Interface**: The frontend component where users interact with the uploaded PDF through questions and answers
- **Vector_Store**: The Chroma database that stores document embeddings for similarity-based retrieval
- **Session**: A stateful interaction tied to a specific uploaded PDF, identified by a file hash
- **STT_Service**: Speech-to-Text service using AssemblyAI (existing service)
- **TTS_Service**: Text-to-Speech service using Murf (existing service)
- **LLM_Model**: The Gemini 2.5 Flash language model (existing service)
- **Source_Citations**: Page number references indicating where answer content originated in the PDF
- **Chat_Mode**: Either Text mode (typed questions) or Speech mode (spoken questions with audio responses)

## Requirements

### Requirement 1: PDF Upload and Processing

**User Story:** As a user, I want to upload a PDF file, so that I can ask questions about its content.

#### Acceptance Criteria

1. WHEN a user clicks the PDF Chat tab, THE Chat_Interface SHALL display an upload area
2. WHEN a user selects a PDF file from their device, THE PDF_Chat_System SHALL accept the file and initiate processing
3. WHEN a PDF file is uploaded, THE RAG_Pipeline SHALL compute a file hash to use as the session identifier
4. WHEN a PDF file is uploaded, THE RAG_Pipeline SHALL load the PDF using PyPDFLoader
5. WHEN a PDF is loaded, THE RAG_Pipeline SHALL split the content using RecursiveCharacterTextSplitter with chunk_size=1000 and chunk_overlap=200
6. WHEN PDF content is split into chunks, THE RAG_Pipeline SHALL generate embeddings using HuggingFaceEmbeddings with the sentence-transformers/all-mpnet-base-v2 model
7. WHEN embeddings are generated, THE RAG_Pipeline SHALL store them in a Chroma vector store in the pdf_chat_collection
8. IF a PDF with the same file hash was previously processed, THEN THE RAG_Pipeline SHALL reuse the cached vector store
9. WHEN processing completes successfully, THE PDF_Chat_System SHALL return the session identifier to the frontend
10. WHEN processing completes successfully, THE Chat_Interface SHALL display the chat window below the upload area
11. IF PDF processing fails, THEN THE PDF_Chat_System SHALL return an error message describing the failure

### Requirement 2: Text-Based Question Answering

**User Story:** As a user, I want to type questions about the uploaded PDF, so that I can quickly get information from the document.

#### Acceptance Criteria

1. WHEN the chat window is displayed, THE Chat_Interface SHALL default to Text mode
2. WHEN a user types a question in Text mode, THE Chat_Interface SHALL send the question to the backend
3. WHEN a text question is received, THE RAG_Pipeline SHALL perform similarity search on the vector store with k=5
4. WHEN relevant chunks are retrieved, THE RAG_Pipeline SHALL provide them as context to the LLM_Model
5. WHEN generating an answer, THE LLM_Model SHALL use only the provided context to answer the question
6. IF the context does not contain information to answer the question, THEN THE LLM_Model SHALL respond that the information is not found in the document
7. WHEN an answer is generated, THE RAG_Pipeline SHALL extract source page numbers from the retrieved chunks
8. WHEN an answer is generated, THE PDF_Chat_System SHALL return both the answer text and the source page numbers
9. WHEN an answer is received, THE Chat_Interface SHALL display the answer with source citations at the bottom
10. FOR ALL valid text questions, generating and displaying an answer SHALL complete within 10 seconds

### Requirement 3: Speech-Based Question Answering

**User Story:** As a user, I want to ask questions by speaking, so that I can interact with the PDF hands-free.

#### Acceptance Criteria

1. WHEN a user toggles to Speech mode, THE Chat_Interface SHALL display a microphone button
2. WHEN a user clicks the microphone button, THE Chat_Interface SHALL begin recording audio
3. WHEN a user finishes speaking, THE Chat_Interface SHALL send the audio to the backend
4. WHEN audio is received, THE STT_Service SHALL transcribe the audio to text
5. WHEN audio transcription completes, THE RAG_Pipeline SHALL process the transcribed text using the same retrieval and generation flow as text questions
6. WHEN an answer is generated in Speech mode, THE TTS_Service SHALL convert the answer text to audio
7. WHEN audio is generated, THE PDF_Chat_System SHALL stream the audio response to the frontend
8. WHEN audio is generated, THE PDF_Chat_System SHALL include the answer text in the X-Answer-Text response header
9. WHEN audio streaming completes, THE Chat_Interface SHALL display the answer text with source citations
10. FOR ALL valid speech questions, generating and playing the audio response SHALL complete within 15 seconds

### Requirement 4: Chat Mode Switching

**User Story:** As a user, I want to switch between Text and Speech modes, so that I can choose my preferred interaction method.

#### Acceptance Criteria

1. WHEN the chat window is displayed, THE Chat_Interface SHALL show a mode toggle with Text and Speech options
2. WHEN a user clicks the Speech option, THE Chat_Interface SHALL switch to Speech mode without clearing chat history
3. WHEN a user clicks the Text option, THE Chat_Interface SHALL switch to Text mode without clearing chat history
4. WHILE switching modes, THE Chat_Interface SHALL preserve all previous questions and answers
5. WHEN mode is switched, THE Chat_Interface SHALL immediately show the appropriate input control for the selected mode

### Requirement 5: PDF Re-upload and Session Reset

**User Story:** As a user, I want to upload a new PDF at any time, so that I can switch to asking questions about different documents.

#### Acceptance Criteria

1. WHILE a chat session is active, THE Chat_Interface SHALL continue to display the upload area
2. WHEN a user uploads a new PDF during an active session, THE PDF_Chat_System SHALL process the new PDF and create a new session
3. WHEN a new PDF is uploaded, THE Chat_Interface SHALL clear all previous chat history
4. WHEN a new PDF is uploaded, THE Chat_Interface SHALL reset to Text mode
5. WHEN a new session begins, THE Chat_Interface SHALL display an empty chat window ready for new questions

### Requirement 6: Navigation Integration

**User Story:** As a user, I want to access PDF Chat from the main navigation, so that I can easily switch between application features.

#### Acceptance Criteria

1. THE NavBar SHALL display a PDF Chat tab alongside the existing Interview and Notes tabs
2. WHEN a user clicks the PDF Chat tab, THE Application SHALL navigate to the /pdf-chat route
3. WHEN the /pdf-chat route is active, THE NavBar SHALL highlight the PDF Chat tab
4. THE Application SHALL preserve existing Interview and Notes functionality without modification

### Requirement 7: RAG System Configuration

**User Story:** As a developer, I want the RAG system properly configured, so that it provides accurate and relevant answers.

#### Acceptance Criteria

1. THE RAG_Pipeline SHALL use RecursiveCharacterTextSplitter with chunk_size exactly 1000 characters
2. THE RAG_Pipeline SHALL use RecursiveCharacterTextSplitter with chunk_overlap exactly 200 characters
3. THE RAG_Pipeline SHALL use HuggingFaceEmbeddings with the model sentence-transformers/all-mpnet-base-v2
4. THE Vector_Store SHALL use Chroma with collection name pdf_chat_collection
5. THE Vector_Store SHALL persist data to the directory ./chroma_pdf_db
6. THE RAG_Pipeline SHALL retrieve exactly 5 chunks during similarity search
7. THE LLM_Model SHALL use the existing google_genai:gemini-2.5-flash model instance from agent_service

### Requirement 8: System Prompt Configuration

**User Story:** As a developer, I want the LLM properly instructed, so that it generates appropriate answers with citations.

#### Acceptance Criteria

1. THE LLM_Model SHALL be instructed to answer only from the provided context
2. THE LLM_Model SHALL be instructed to state when information is not found in the context
3. THE LLM_Model SHALL be instructed to include source page numbers in responses
4. THE PDF_Chat_System SHALL format source citations as page number references at the end of answers

### Requirement 9: Resource Management

**User Story:** As a developer, I want resources properly managed, so that the system remains stable and does not leak resources.

#### Acceptance Criteria

1. WHEN temporary files are created during PDF processing, THE RAG_Pipeline SHALL delete them in a finally block
2. WHEN audio files are created for STT processing, THE PDF_Chat_System SHALL delete them in a finally block
3. WHEN audio files are created for TTS streaming, THE PDF_Chat_System SHALL delete them in a finally block
4. THE Vector_Store SHALL cache processed PDFs by file hash to avoid reprocessing identical files
5. IF an error occurs during processing, THEN THE RAG_Pipeline SHALL clean up all temporary resources before raising the error

### Requirement 10: API Endpoint Structure

**User Story:** As a developer, I want well-defined API endpoints, so that the frontend can reliably communicate with the backend.

#### Acceptance Criteria

1. THE PDF_Chat_System SHALL provide a POST /pdf-chat/upload endpoint that accepts PDF files
2. WHEN /pdf-chat/upload succeeds, THE PDF_Chat_System SHALL return a JSON response containing the session_id
3. THE PDF_Chat_System SHALL provide a POST /pdf-chat/ask-text endpoint that accepts question text and session_id
4. WHEN /pdf-chat/ask-text succeeds, THE PDF_Chat_System SHALL return a JSON response containing answer text and source page numbers
5. THE PDF_Chat_System SHALL provide a POST /pdf-chat/ask-speech endpoint that accepts audio data and session_id
6. WHEN /pdf-chat/ask-speech succeeds, THE PDF_Chat_System SHALL stream audio in the response body
7. WHEN /pdf-chat/ask-speech succeeds, THE PDF_Chat_System SHALL include the answer text in the X-Answer-Text header
8. THE Flask_App SHALL register the pdf_chat blueprint to expose these endpoints
9. THE Flask_App SHALL add X-Answer-Text to the CORS expose_headers configuration

### Requirement 11: Dependency Management

**User Story:** As a developer, I want all required dependencies installed, so that the PDF Chat feature can function.

#### Acceptance Criteria

1. THE Backend SHALL include langchain-community in requirements.txt
2. THE Backend SHALL include langchain-huggingface in requirements.txt
3. THE Backend SHALL include langchain-chroma in requirements.txt
4. THE Backend SHALL include chromadb in requirements.txt
5. THE Backend SHALL include pypdf in requirements.txt
6. THE Backend SHALL include sentence-transformers in requirements.txt
7. THE Backend SHALL continue to include all existing dependencies for Interview and Notes features

### Requirement 12: Frontend Component Structure

**User Story:** As a developer, I want well-structured frontend components, so that the UI is maintainable and follows the existing architecture.

#### Acceptance Criteria

1. THE Frontend SHALL create a PdfChatPage component as the main page container
2. THE Frontend SHALL create an UploadArea component that handles file selection and upload
3. THE Frontend SHALL create a ChatWindow component that displays the conversation
4. THE Frontend SHALL create a ChatMessage component that renders individual messages with citations
5. THE Frontend SHALL create a ModeToggle component that switches between Text and Speech modes
6. THE Frontend SHALL create a usePdfChat custom hook that manages chat state and API calls
7. THE Frontend SHALL create a pdfChatApi module that encapsulates backend communication
8. THE Frontend SHALL extend the AppTab type to include pdf-chat
9. THE Frontend SHALL define ChatMode, ChatMessage, UploadResponse, and AskTextResponse types
10. THE Application SHALL render PdfChatPage when navigating to /pdf-chat

### Requirement 13: Service Reuse

**User Story:** As a developer, I want to reuse existing services, so that the codebase remains DRY and consistent.

#### Acceptance Criteria

1. THE PDF_Chat_System SHALL use the existing STT_Service from stt_service.py for speech-to-text conversion
2. THE PDF_Chat_System SHALL use the existing TTS_Service from tts_service.py for text-to-speech conversion
3. THE PDF_Chat_System SHALL use the existing LLM_Model instance from agent_service.py for answer generation
4. THE RAG_Service SHALL NOT duplicate STT, TTS, or LLM initialization code
5. THE RAG_Service SHALL import and call existing service functions rather than reimplementing them

// Core subject types
export type InterviewSubject =
  | 'Operating System'
  | 'Object Oriented Programming'
  | 'Database Management System'
  | 'Computer Networks';

export type NotesSubject = 'OS' | 'OOP' | 'DBMS' | 'CN';

export type AppTab = 'interview' | 'notes' | 'pdf-chat';

export type InterviewPhase = 'welcome' | 'active' | 'feedback';

export interface FeedbackData {
  subject: string;
  candidate_score: number;
  feedback: string;
  areas_of_improvement: string;
}

export interface SubmitAnswerMeta {
  isComplete: boolean;
  questionNumber: number;
}

export interface FeedbackResponse {
  success: boolean;
  feedback: FeedbackData;
}

// ── PDF Chat ──────────────────────────────────────────

export type ChatMode = 'text' | 'speech';

export interface PdfChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: number[];
  isStreaming?: boolean;
}

export interface PdfTab {
  threadId: string;
  fileHash: string;
  fileName: string;
  messages: PdfChatMessage[];
}

export interface UploadResponse {
  success?: boolean;
  thread_id?: string;
  file_hash?: string;
  error?: string;
}

export interface AskTextResponse {
  success?: boolean;
  answer?: string;
  sources?: number[];
  error?: string;
}

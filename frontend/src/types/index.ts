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
}

export interface UploadResponse {
  session_id?: string;
  error?: string;
}

export interface AskTextResponse {
  answer?: string;
  sources?: number[];
  error?: string;
}

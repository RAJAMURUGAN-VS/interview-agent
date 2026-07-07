// Core subject types
export type InterviewSubject =
  | 'Operating System'
  | 'Object Oriented Programming'
  | 'Database Management System'
  | 'Computer Networks';

export type NotesSubject = 'OS' | 'OOP' | 'DBMS' | 'CN';

export type AppTab = 'interview' | 'notes' | 'pdf-chat' | 'mcq';

export type InterviewPhase = 'welcome' | 'active' | 'feedback';

export interface FeedbackData {
  subject: string;
  candidate_score: number;
  feedback: string;
  areas_of_improvement: string;
  pronunciation_feedback?: PronunciationFeedback;
}

export interface PronunciationPerAnswer {
  answer_number: number;
  filler_count: number;
  fillers_used: string[];
  long_pause_count: number;
  note: string;
}

export interface PronunciationFeedback {
  summary: string;
  tips: string[];
  per_answer: PronunciationPerAnswer[];
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

// ── MCQ ───────────────────────────────────────────────

export type McqQuestionType  = 'mcq' | 'truefalse';
export type McqQuestionCount = 5 | 10 | 15 | 20;
export type McqSourceType    = 'text' | 'pdf';
export type McqReviewFilter  = 'all' | 'correct' | 'wrong';
export type McqPhase         = 'setup' | 'quiz' | 'feedback';
export type McqGrade         = 'Excellent' | 'Good' | 'Needs Revision' | 'Poor';

export interface McqOption {
  label: string;
  text: string;
}

export interface McqQuestion {
  id: string;
  type: McqQuestionType;
  question: string;
  options: McqOption[];
  correct_label: string;
  explanation: string;
}

export interface McqAnswer {
  question_id: string;
  selected_label: string;
  is_correct: boolean;
}

export interface McqSessionConfig {
  source_type: McqSourceType;
  topic: string;
  question_count: McqQuestionCount;
  question_type: McqQuestionType;
}

export interface McqFeedback {
  score: number;
  total: number;
  percentage: number;
  grade: McqGrade;
  summary: string;
  weak_areas: string[];
  study_tips: string[];
}

export interface McqGenerateResponse {
  success: boolean;
  questions?: McqQuestion[];
  error?: string;
}

export interface McqFeedbackResponse {
  success: boolean;
  feedback?: McqFeedback;
  error?: string;
}

export type InterviewSubject =
  | 'Operating System'
  | 'Object Oriented Programming'
  | 'Database Management System'
  | 'Computer Networks';

export type NotesSubject = 'OS' | 'OOP' | 'DBMS' | 'CN';

export type AppTab = 'interview' | 'notes';

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

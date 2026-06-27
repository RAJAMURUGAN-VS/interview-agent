export type Subject =
  | 'Self Introduction'
  | 'Generative AI'
  | 'Python'
  | 'English'
  | 'HTML'
  | 'CSS';

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

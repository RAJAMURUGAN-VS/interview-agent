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

// URL slug <-> Subject mapping
export const subjectSlugs: Record<string, Subject> = {
  'self-introduction': 'Self Introduction',
  'generative-ai':     'Generative AI',
  'python':            'Python',
  'english':           'English',
  'html':              'HTML',
  'css':               'CSS',
};

export function toSlug(subject: Subject): string {
  return subject.toLowerCase().replace(/\s+/g, '-');
}

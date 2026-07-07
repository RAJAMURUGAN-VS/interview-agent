import type {
  McqGenerateResponse,
  McqFeedbackResponse,
  McqQuestion,
  McqAnswer,
  McqQuestionCount,
  McqQuestionType,
  McqSourceType,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function generateQuestions(params: {
  source_type: McqSourceType;
  content?: string;
  pdfFile?: File;
  topic: string;
  question_count: McqQuestionCount;
  question_type: McqQuestionType;
}): Promise<McqGenerateResponse> {
  const formData = new FormData();
  formData.append('source_type',    params.source_type);
  formData.append('topic',          params.topic);
  formData.append('question_count', String(params.question_count));
  formData.append('question_type',  params.question_type);

  if (params.source_type === 'pdf' && params.pdfFile) {
    formData.append('pdf', params.pdfFile);
  } else {
    formData.append('content', params.content ?? '');
  }

  const res = await fetch(`${BASE}/mcq/generate`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function fetchFeedback(params: {
  questions: McqQuestion[];
  answers: McqAnswer[];
  topic: string;
  question_type: McqQuestionType;
}): Promise<McqFeedbackResponse> {
  const res = await fetch(`${BASE}/mcq/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

import type {
  CfGenerateResponse,
  CfCheckResponse,
  CfFeedbackResponse,
  CfLanguage,
  CfCategory,
  CfQuestion,
  CfAnswerRecord,
  CfQuestionCount,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function generateCfQuestions(params: {
  language: CfLanguage;
  category: CfCategory;
  topics: string[];
  question_count: CfQuestionCount;
}): Promise<CfGenerateResponse> {
  const res = await fetch(`${BASE}/codefill/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function checkCfAnswer(params: {
  question: CfQuestion;
  user_answers: string[];
}): Promise<CfCheckResponse> {
  const res = await fetch(`${BASE}/codefill/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchCfFeedback(params: {
  language: CfLanguage;
  category: CfCategory;
  topics: string[];
  questions: CfQuestion[];
  answer_records: CfAnswerRecord[];
}): Promise<CfFeedbackResponse> {
  const res = await fetch(`${BASE}/codefill/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

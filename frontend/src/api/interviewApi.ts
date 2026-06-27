import type { FeedbackResponse, Subject, SubmitAnswerMeta } from '../types/interview';

const BASE_URL = import.meta.env.VITE_API_URL;

export async function startInterview(subject: Subject): Promise<Response> {
  return fetch(`${BASE_URL}/start-interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject }),
  });
}

export async function submitAnswer(
  audioBlob: Blob
): Promise<{ meta: SubmitAnswerMeta; response: Response }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'answer.webm');

  const response = await fetch(`${BASE_URL}/submit-answer`, {
    method: 'POST',
    body: formData,
  });

  const isComplete = response.headers.get('X-Interview-Complete') === 'true';
  const questionNumberRaw = response.headers.get('X-Question-Number');
  const questionNumber = questionNumberRaw ? parseInt(questionNumberRaw, 10) : 1;

  const meta: SubmitAnswerMeta = { isComplete, questionNumber };

  return { meta, response };
}

export async function getFeedback(): Promise<FeedbackResponse> {
  const response = await fetch(`${BASE_URL}/get-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  return response.json() as Promise<FeedbackResponse>;
}

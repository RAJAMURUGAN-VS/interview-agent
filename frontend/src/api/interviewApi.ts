import type { FeedbackResponse, InterviewSubject, SubmitAnswerMeta } from '../types';

// Empty string = use Vite proxy (relative URLs). Non-empty = direct URL to backend.
const BASE_URL: string = import.meta.env.VITE_API_URL || '';

export async function startInterview(
  subject: string,
  department: string = 'Engineering',
): Promise<Response> {
  const response = await fetch(`${BASE_URL}/start-interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, department }),
  });
  if (!response.ok) {
    throw new Error(`start-interview failed: ${response.status} ${response.statusText}`);
  }
  return response;
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

  if (!response.ok) {
    throw new Error(`submit-answer failed: ${response.status} ${response.statusText}`);
  }

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

  if (!response.ok) {
    throw new Error(`get-feedback failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<FeedbackResponse>;
}

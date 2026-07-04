import type { UploadResponse, AskTextResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL;

/**
 * Upload a PDF file — returns thread_id + file_hash on success.
 * POST /pdf-chat/upload
 */
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch(`${BASE}/pdf-chat/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

/**
 * Ask a text question for a specific PDF thread.
 * POST /pdf-chat/ask-text
 */
export async function askText(
  threadId: string,
  question: string,
): Promise<AskTextResponse> {
  const res = await fetch(`${BASE}/pdf-chat/ask-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, question }),
  });
  return res.json();
}

/**
 * Ask a speech question — returns raw Response for streaming + X-Answer-Text header.
 * POST /pdf-chat/ask-speech
 */
export async function askSpeech(
  threadId: string,
  audioBlob: Blob,
): Promise<{ response: Response; answerText: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'question.webm');
  formData.append('thread_id', threadId);

  const res = await fetch(`${BASE}/pdf-chat/ask-speech`, {
    method: 'POST',
    body: formData,
  });
  const answerText = res.headers.get('X-Answer-Text') ?? '';
  return { response: res, answerText };
}

/**
 * Delete a PDF session when a tab is closed. Fire-and-forget.
 * DELETE /pdf-chat/session
 */
export async function deleteSession(threadId: string): Promise<void> {
  await fetch(`${BASE}/pdf-chat/session`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId }),
  });
}

import type { AskTextResponse, UploadResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL;

/**
 * Upload a PDF file to create a RAG session.
 * POST /pdf-chat/upload — multipart/form-data, field name: `pdf`
 */
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch(`${BASE}/pdf-chat/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<UploadResponse>;
}

/**
 * Ask a text question against an existing session.
 * POST /pdf-chat/ask-text — JSON body: { session_id, question }
 */
export async function askText(
  sessionId: string,
  question: string
): Promise<AskTextResponse> {
  const response = await fetch(`${BASE}/pdf-chat/ask-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  if (!response.ok) {
    throw new Error(`ask-text failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<AskTextResponse>;
}

/**
 * Ask a speech question against an existing session.
 * POST /pdf-chat/ask-speech — multipart/form-data, fields: `audio` (filename question.webm) + `session_id`
 * Returns the raw Response so the caller can stream audio and read the X-Answer-Text header.
 */
export async function askSpeech(sessionId: string, audioBlob: Blob): Promise<Response> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'question.webm');
  formData.append('session_id', sessionId);

  const response = await fetch(`${BASE}/pdf-chat/ask-speech`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ask-speech failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

import type { UploadResponse, AskTextResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL;

/** Processing stages used by the frontend animated progress. */
export type UploadStage =
  | 'idle' | 'starting' | 'reading' | 'organising'
  | 'understanding' | 'indexing' | 'finalizing' | 'done' | 'error';

/**
 * Upload a PDF — waits for the backend to finish processing (blocking).
 * Returns { thread_id, file_hash } on success.
 * POST /pdf-chat/upload
 */
export async function uploadPdfWithProgress(
  file: File,
): Promise<{ thread_id: string; file_hash: string }> {
  const formData = new FormData();
  formData.append('pdf', file);
  const res  = await fetch(`${BASE}/pdf-chat/upload`, { method: 'POST', body: formData });
  const data = await res.json() as UploadResponse;
  if (!data.success || !data.thread_id || !data.file_hash) {
    throw new Error(data.error ?? 'Upload failed. Please try again.');
  }
  return { thread_id: data.thread_id, file_hash: data.file_hash };
}

/** Legacy alias — kept for compatibility. */
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('pdf', file);
  const res = await fetch(`${BASE}/pdf-chat/upload`, { method: 'POST', body: formData });
  return res.json();
}

/**
 * Ask a text question. Sends file_hash so the backend can
 * auto-recover the session after a restart.
 * POST /pdf-chat/ask-text
 */
export async function askText(
  threadId: string,
  question: string,
  fileHash?: string,
): Promise<AskTextResponse> {
  const res = await fetch(`${BASE}/pdf-chat/ask-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, question, file_hash: fileHash ?? '' }),
  });
  return res.json();
}

/**
 * Step 1 of speech pipeline: transcribe audio to text.
 * POST /pdf-chat/transcribe
 */
export async function transcribeAudio(
  audioBlob: Blob,
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'question.webm');
  const res = await fetch(`${BASE}/pdf-chat/transcribe`, { method: 'POST', body: formData });
  return res.json();
}

/**
 * Step 2 of speech pipeline: RAG + LLM + TTS stream.
 * POST /pdf-chat/ask-speech-answer
 */
export async function askSpeechAnswer(
  threadId: string,
  transcript: string,
): Promise<{ response: Response; answerText: string; ok: boolean }> {
  const res = await fetch(`${BASE}/pdf-chat/ask-speech-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, transcript }),
  });
  const rawAnswer = res.headers.get('X-Answer-Text') ?? '';
  let answerText = '';
  try { answerText = decodeURIComponent(rawAnswer); } catch { answerText = rawAnswer; }
  return { response: res, answerText, ok: res.ok };
}

/**
 * Stream TTS audio for the given text.
 * POST /pdf-chat/tts
 */
export async function streamTtsAudio(text: string): Promise<Response> {
  return fetch(`${BASE}/pdf-chat/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

/** Delete a PDF session when a tab is closed. Fire-and-forget. */
export async function deleteSession(threadId: string): Promise<void> {
  await fetch(`${BASE}/pdf-chat/session`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId }),
  });
}

/**
 * Create a new session for an already-embedded PDF (IDB cache hit).
 * POST /pdf-chat/session-from-hash
 */
export async function createSessionFromHash(
  fileHash: string,
  fileName: string,
): Promise<UploadResponse> {
  try {
    const res = await fetch(`${BASE}/pdf-chat/session-from-hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_hash: fileHash, file_name: fileName }),
    });
    return res.json();
  } catch {
    return { success: false, error: 'cache-miss' };
  }
}

/**
 * Permanently delete a PDF's vector store from ChromaDB.
 * DELETE /pdf-chat/delete-pdf
 */
export async function deletePdfVectorStore(fileHash: string): Promise<void> {
  try {
    await fetch(`${BASE}/pdf-chat/delete-pdf`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_hash: fileHash }),
    });
  } catch { /* fire-and-forget */ }
}

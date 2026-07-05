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
 * Step 1 of speech pipeline: transcribe audio to text.
 * Returns the transcript immediately so the UI can show it right away.
 * POST /pdf-chat/transcribe
 */
export async function transcribeAudio(
  audioBlob: Blob,
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'question.webm');
  const res = await fetch(`${BASE}/pdf-chat/transcribe`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

/**
 * Step 2 of speech pipeline: RAG retrieval + LLM answer + TTS stream.
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
  try {
    answerText = decodeURIComponent(rawAnswer);
  } catch (e) {
    answerText = rawAnswer;
  }
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

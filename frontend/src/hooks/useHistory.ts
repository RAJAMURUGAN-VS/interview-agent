import { useState, useCallback } from 'react';
import type {
  InterviewHistoryEntry,
  McqHistoryEntry,
  PdfChatHistoryEntry,
} from '../types';

// ── localStorage keys ───────────────────────────────────────────────────
const KEYS = {
  interview: 'interview_history',
  mcq:       'mcq_history',
  pdfchat:   'pdfchat_history',
} as const;

// ── Generic localStorage helpers ──────────────────────────────────────────

function readFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded — fail silently
  }
}

// ── Interview history helpers ─────────────────────────────────────────────

export function saveInterviewEntry(entry: InterviewHistoryEntry): void {
  const existing = readFromStorage<InterviewHistoryEntry>(KEYS.interview);
  writeToStorage(KEYS.interview, [entry, ...existing]);
}

export function loadInterviewHistory(): InterviewHistoryEntry[] {
  return readFromStorage<InterviewHistoryEntry>(KEYS.interview);
}

export function deleteInterviewEntry(id: string): InterviewHistoryEntry[] {
  const updated = readFromStorage<InterviewHistoryEntry>(KEYS.interview)
    .filter((e) => e.id !== id);
  writeToStorage(KEYS.interview, updated);
  return updated;
}

// ── MCQ history helpers ───────────────────────────────────────────────────

export function saveMcqEntry(entry: McqHistoryEntry): void {
  const existing = readFromStorage<McqHistoryEntry>(KEYS.mcq);
  writeToStorage(KEYS.mcq, [entry, ...existing]);
}

export function loadMcqHistory(): McqHistoryEntry[] {
  return readFromStorage<McqHistoryEntry>(KEYS.mcq);
}

export function deleteMcqEntry(id: string): McqHistoryEntry[] {
  const updated = readFromStorage<McqHistoryEntry>(KEYS.mcq)
    .filter((e) => e.id !== id);
  writeToStorage(KEYS.mcq, updated);
  return updated;
}

// ── PDF Chat history helpers ──────────────────────────────────────────────

export function savePdfChatEntry(entry: PdfChatHistoryEntry): void {
  const existing = readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat);
  // Avoid duplicates — replace if same id exists
  const filtered = existing.filter((e) => e.id !== entry.id);
  writeToStorage(KEYS.pdfchat, [entry, ...filtered]);
}

export function loadPdfChatHistory(): PdfChatHistoryEntry[] {
  return readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat);
}

export function deletePdfChatEntry(id: string): PdfChatHistoryEntry[] {
  const updated = readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat)
    .filter((e) => e.id !== id);
  writeToStorage(KEYS.pdfchat, updated);
  return updated;
}

// ── useHistory hook — for components that need reactive history state ──────

export function useInterviewHistory() {
  const [entries, setEntries] = useState<InterviewHistoryEntry[]>(
    () => loadInterviewHistory()
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries(deleteInterviewEntry(id));
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadInterviewHistory());
  }, []);

  return { entries, deleteEntry, refresh };
}

export function useMcqHistory() {
  const [entries, setEntries] = useState<McqHistoryEntry[]>(
    () => loadMcqHistory()
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries(deleteMcqEntry(id));
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadMcqHistory());
  }, []);

  return { entries, deleteEntry, refresh };
}

export function usePdfChatHistory() {
  const [entries, setEntries] = useState<PdfChatHistoryEntry[]>(
    () => loadPdfChatHistory()
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries(deletePdfChatEntry(id));
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadPdfChatHistory());
  }, []);

  return { entries, deleteEntry, refresh };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  InterviewHistoryEntry,
  McqHistoryEntry,
  PdfChatHistoryEntry,
  PdfChatMessage,
} from '../types';

// ── localStorage keys ───────────────────────────────────────────────────
const KEYS = {
  interview: 'interview_history',
  mcq:       'mcq_history',
  pdfchat:   'pdfchat_history',
} as const;

export const ACTIVE_PREFIX = 'pdfchat_active_';

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

// Custom event name — fired whenever pdfchat_history changes in the same tab
const PDF_HISTORY_CHANGED = 'pdfchat_history_changed';

function emitHistoryChanged() {
  window.dispatchEvent(new CustomEvent(PDF_HISTORY_CHANGED));
}

export function savePdfChatEntry(entry: PdfChatHistoryEntry): void {
  const existing = readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat);
  const filtered = existing.filter((e) => e.id !== entry.id);
  writeToStorage(KEYS.pdfchat, [entry, ...filtered]);
  emitHistoryChanged();
}

/** Update an existing entry's messages + savedAt in-place, keeping same id. */
export function updatePdfChatEntry(
  id: string,
  updates: Partial<Pick<PdfChatHistoryEntry, 'messages' | 'messageCount' | 'savedAt'>>
): void {
  const existing = readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat);
  const updated  = existing.map((e) =>
    e.id === id ? { ...e, ...updates } : e
  );
  writeToStorage(KEYS.pdfchat, updated);
  emitHistoryChanged();
}

export function loadPdfChatHistory(): PdfChatHistoryEntry[] {
  return readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat);
}

export function deletePdfChatEntry(id: string): PdfChatHistoryEntry[] {
  const updated = readFromStorage<PdfChatHistoryEntry>(KEYS.pdfchat)
    .filter((e) => e.id !== id);
  writeToStorage(KEYS.pdfchat, updated);
  emitHistoryChanged();
  return updated;
}

// ── Active PDF session helpers (live, in-progress tabs) ─────────────────
// Each active session is stored under: pdfchat_active_{threadId}

export interface ActivePdfSession {
  threadId:        string;
  fileName:        string;
  messages:        PdfChatMessage[];
  startedAt:       string;
  historyEntryId?: string;  // set when restored from history — used to update the same entry on close
}

export function saveActivePdfSession(session: ActivePdfSession): void {
  try {
    localStorage.setItem(
      `${ACTIVE_PREFIX}${session.threadId}`,
      JSON.stringify(session),
    );
  } catch {
    // Quota exceeded — fail silently
  }
}

export function removeActivePdfSession(threadId: string): void {
  localStorage.removeItem(`${ACTIVE_PREFIX}${threadId}`);
}

export function loadActivePdfSessions(): ActivePdfSession[] {
  const sessions: ActivePdfSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ACTIVE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ActivePdfSession;
          sessions.push(parsed);
        }
      }
    }
  } catch {
    // ignore
  }
  return sessions.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

// ── useHistory hook — for components that need reactive history state ──────

export function useInterviewHistory() {
  const [entries, setEntries] = useState<InterviewHistoryEntry[]>(
    () => loadInterviewHistory(),
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
    () => loadMcqHistory(),
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
    () => loadPdfChatHistory(),
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries(deletePdfChatEntry(id));
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadPdfChatHistory());
  }, []);

  return { entries, deleteEntry, refresh };
}

// ── useLivePdfChatHistory ────────────────────────────────────────────────────
// Reacts to BOTH:
//  • Same-tab writes via the custom 'pdfchat_history_changed' event
//  • Cross-tab writes via the native 'storage' event

export function useLivePdfChatHistory() {
  const [closedEntries, setClosedEntries] = useState<PdfChatHistoryEntry[]>(
    () => loadPdfChatHistory(),
  );

  useEffect(() => {
    const refresh = () => setClosedEntries(loadPdfChatHistory());

    // Same-tab: fired by savePdfChatEntry / deletePdfChatEntry
    window.addEventListener(PDF_HISTORY_CHANGED, refresh);
    // Cross-tab: native storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.pdfchat || e.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(PDF_HISTORY_CHANGED, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const deleteClosedEntry = useCallback((id: string) => {
    // deletePdfChatEntry already emits the event, so state updates automatically
    deletePdfChatEntry(id);
    setClosedEntries(loadPdfChatHistory());
  }, []);

  const refreshClosed = useCallback(() => {
    setClosedEntries(loadPdfChatHistory());
  }, []);

  return { closedEntries, deleteClosedEntry, refreshClosed };
}

// ── Debounce helper ────────────────────────────────────────────────────────
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

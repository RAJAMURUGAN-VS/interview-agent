/**
 * PdfChatContext — lifts all PDF chat state above the router so it survives
 * section switches. When the user navigates away and returns, the upload
 * progress, tabs, and messages are exactly where they left them.
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import type { PdfTab, PdfChatMessage, ChatMode, PdfChatHistoryEntry } from '../types';
import {
  uploadPdfWithProgress,
  askText, transcribeAudio, streamTtsAudio,
  deleteSession, createSessionFromHash,
  type UploadStage,
} from '../api/pdfChatApi';
import { useAudioStream }   from '../hooks/useAudioStream';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import {
  savePdfChatEntry,
  updatePdfChatEntry,
} from '../hooks/useHistory';
import {
  usePdfCacheCheck,
  type ChunkData,
} from '../hooks/usePdfChatIndexedDB';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadProgress {
  active:   boolean;         // is an upload in progress?
  stage:    UploadStage;
  message:  string;
  progress: number;          // 0–100
  error:    string | null;
  fileName: string | null;
}

const INITIAL_PROGRESS: UploadProgress = {
  active: false, stage: 'idle', message: '', progress: 0,
  error: null, fileName: null,
};

interface PdfChatContextValue {
  // tabs
  tabs:           PdfTab[];
  activeThreadId: string | null;
  activeTab:      PdfTab | null;

  // upload
  showUploadPanel: boolean;
  uploadProgress:  UploadProgress;

  // chat input / state
  mode:        ChatMode;
  textInput:   string;
  isAsking:    boolean;
  isSpeaking:  boolean;
  isPaused:    boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;

  setMode:      (m: ChatMode) => void;
  setTextInput: (v: string) => void;

  handleUpload:          (file: File) => Promise<void>;
  handleSelectTab:       (threadId: string) => void;
  handleCloseTab:        (threadId: string) => void;
  handleShowUploadPanel: () => void;
  handleAskText:         () => Promise<void>;
  handleSubmitSpeech:    () => Promise<void>;
  startRecording:        () => void;
  stopRecording:         () => void;
  pauseAudio:            () => void;
  resumeAudio:           () => void;
  stopAudio:             () => void;
  markMessageStreamingComplete: (threadId: string, messageId: string) => void;
  restoreFromHistory:    (entry: PdfChatHistoryEntry) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PdfChatContext = createContext<PdfChatContextValue | null>(null);

export function usePdfChatContext(): PdfChatContextValue {
  const ctx = useContext(PdfChatContext);
  if (!ctx) throw new Error('usePdfChatContext must be used inside PdfChatProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const SYNC_DEBOUNCE_MS = 400;

export function PdfChatProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs]                     = useState<PdfTab[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadProgress, setUploadProgress]   = useState<UploadProgress>(INITIAL_PROGRESS);

  const [mode, setMode]           = useState<ChatMode>('text');
  const [textInput, setTextInput] = useState('');
  const [isAsking, setIsAsking]   = useState(false);

  const { isSpeaking, isPaused, playStream, pauseAudio, resumeAudio, stopAudio } = useAudioStream();
  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { checkCache, storeCache } = usePdfCacheCheck();

  const activeTab = tabs.find((t) => t.threadId === activeThreadId) ?? null;

  // ── Debounced history sync ─────────────────────────────────────────────
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syncTabToHistory = useCallback((tab: PdfTab) => {
    if (!tab.historyEntryId) return;
    if (syncTimers.current[tab.threadId]) clearTimeout(syncTimers.current[tab.threadId]);
    syncTimers.current[tab.threadId] = setTimeout(() => {
      updatePdfChatEntry(tab.historyEntryId!, {
        messages:     tab.messages,
        messageCount: tab.messages.length,
        savedAt:      new Date().toISOString(),
      });
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const prevTabsRef = useRef<PdfTab[]>([]);
  useEffect(() => {
    tabs.forEach((tab) => {
      const prev = prevTabsRef.current.find((t) => t.threadId === tab.threadId);
      if (!prev || prev.messages.length !== tab.messages.length) syncTabToHistory(tab);
    });
    prevTabsRef.current = tabs;
  }, [tabs, syncTabToHistory]);

  // ── Append message ─────────────────────────────────────────────────────
  const appendMessage = useCallback(
    (threadId: string, role: 'user' | 'assistant', text: string,
     sources?: number[], isStreaming?: boolean) => {
      const newMsg: PdfChatMessage = {
        id: crypto.randomUUID(), role, text, sources, isStreaming,
      };
      setTabs((prev) =>
        prev.map((t) =>
          t.threadId === threadId ? { ...t, messages: [...t.messages, newMsg] } : t,
        ),
      );
    },
    [],
  );

  const markMessageStreamingComplete = useCallback(
    (threadId: string, messageId: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.threadId !== threadId ? t : {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, isStreaming: false } : m,
            ),
          },
        ),
      );
    },
    [],
  );

  // ── Upload PDF — blocking fetch with animated fake progress ─────────────
  //
  // The backend processes synchronously and returns {thread_id, file_hash}.
  // We animate the progress bar on a timer while the fetch is in-flight.
  const UPLOAD_STAGES: Array<{ stage: UploadStage; message: string; pct: number; delay: number }> = [
    { stage: 'starting',      message: 'Getting your PDF ready…',                                  pct:  5, delay:    500 },
    { stage: 'reading',       message: 'Reading your PDF…',                                        pct: 20, delay:  3000 },
    { stage: 'organising',    message: 'Organising content…',                                      pct: 42, delay:  8000 },
    { stage: 'understanding', message: 'Understanding your document…',                             pct: 62, delay: 15000 },
    { stage: 'indexing',      message: 'Making it searchable…',                                    pct: 78, delay: 25000 },
    { stage: 'finalizing',    message: 'Almost there… this may take a moment, please wait.',       pct: 88, delay: 40000 },
  ];

  const handleUpload = useCallback(async (file: File) => {
    setUploadProgress({ active: true, stage: 'starting', message: 'Getting your PDF ready…', progress: 5, error: null, fileName: file.name });
    setShowUploadPanel(true);

    let resolvedHash = '';
    let thread_id    = '';
    let file_hash    = '';

    try {
      // ── Fast path: file already processed (IndexedDB cache hit) ──────────
      const cacheResult = await checkCache(file);
      resolvedHash = cacheResult.fileHash;

      if (cacheResult.hit) {
        setUploadProgress((p) => ({ ...p, stage: 'finalizing', message: 'Loading your document…', progress: 80 }));
        const fromHash = await createSessionFromHash(cacheResult.record.fileHash, file.name);
        if (fromHash.success && fromHash.thread_id && fromHash.file_hash) {
          thread_id = fromHash.thread_id;
          file_hash = fromHash.file_hash;
        }
      }

      // ── Full upload path (first time or cache-miss) ────────────────────
      if (!thread_id) {
        // Animate progress bar while the blocking fetch is running
        let animIdx = 0;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const scheduleNext = () => {
          if (animIdx >= UPLOAD_STAGES.length) return;
          const s = UPLOAD_STAGES[animIdx++];
          const t = setTimeout(() => {
            setUploadProgress((p) => p.active ? { ...p, stage: s.stage, message: s.message, progress: s.pct } : p);
            scheduleNext();
          }, s.delay);
          timers.push(t);
        };
        scheduleNext();

        try {
          const result = await uploadPdfWithProgress(file);  // waits for backend to finish
          timers.forEach(clearTimeout);
          thread_id = result.thread_id;
          file_hash = result.file_hash;
        } catch (uploadErr) {
          timers.forEach(clearTimeout);
          setUploadProgress((p) => ({
            ...p, active: false, stage: 'error',
            error: uploadErr instanceof Error ? uploadErr.message : 'Upload failed. Please try again.',
          }));
          return;
        }
      }

      // ── Success: create history entry and open tab ─────────────────────
      const historyEntryId = crypto.randomUUID();
      savePdfChatEntry({ id: historyEntryId, savedAt: new Date().toISOString(), fileName: file.name, fileHash: file_hash, messageCount: 0, messages: [] });

      setTabs((prev) => [...prev, { threadId: thread_id, fileHash: file_hash, fileName: file.name, messages: [], startedAt: new Date().toISOString(), historyEntryId }]);
      setActiveThreadId(thread_id);
      setShowUploadPanel(false);
      setUploadProgress(INITIAL_PROGRESS);

      if (resolvedHash && file_hash) {
        storeCache(file, resolvedHash, thread_id, [] as ChunkData[]).catch(() => {});
      }
    } catch (err) {
      setUploadProgress((p) => ({ ...p, active: false, stage: 'error', error: 'Upload failed. Please try again.' }));
    }
  }, [checkCache, storeCache]);


  // ── Tab management ─────────────────────────────────────────────────────
  const handleSelectTab = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setShowUploadPanel(false);
    setTextInput('');
  }, []);

  const handleCloseTab = useCallback((threadId: string) => {
    if (syncTimers.current[threadId]) {
      clearTimeout(syncTimers.current[threadId]);
      delete syncTimers.current[threadId];
    }
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.threadId !== threadId);
      setActiveThreadId((cur) => {
        if (cur !== threadId) return cur;
        const idx  = prev.findIndex((t) => t.threadId === threadId);
        const next = remaining[idx] ?? remaining[idx - 1] ?? null;
        return next?.threadId ?? null;
      });
      return remaining;
    });
    deleteSession(threadId).catch(() => {});
  }, []);

  const handleShowUploadPanel = useCallback(() => {
    setShowUploadPanel(true);
    setUploadProgress(INITIAL_PROGRESS);
  }, []);

  // ── Restore from history ───────────────────────────────────────────────
  const restoreFromHistory = useCallback(async (entry: PdfChatHistoryEntry) => {
    const existing = tabs.find((t) => t.historyEntryId === entry.id);
    if (existing) {
      setActiveThreadId(existing.threadId);
      setShowUploadPanel(false);
      return;
    }
    let threadId = `view_${crypto.randomUUID().slice(0, 8)}`;
    if (entry.fileHash) {
      try {
        const res = await createSessionFromHash(entry.fileHash, entry.fileName);
        if (res.success && res.thread_id) threadId = res.thread_id;
      } catch { /* messages still visible, can't ask new ones */ }
    }
    const messages: PdfChatMessage[] = entry.messages.map((m) => ({ ...m, isStreaming: false }));
    setTabs((prev) => [
      ...prev,
      {
        threadId, fileHash: entry.fileHash ?? '', fileName: entry.fileName,
        messages, startedAt: new Date().toISOString(), historyEntryId: entry.id,
      },
    ]);
    setActiveThreadId(threadId);
    setShowUploadPanel(false);
  }, [tabs]);

  // ── Refs (stale-closure prevention) ───────────────────────────────────
  const activeTabRef  = useRef(activeTab);  activeTabRef.current  = activeTab;
  const textInputRef  = useRef(textInput);  textInputRef.current  = textInput;
  const isAskingRef   = useRef(isAsking);   isAskingRef.current   = isAsking;

  // ── Ask: text mode ─────────────────────────────────────────────────────
  const handleAskText = useCallback(async () => {
    const tab   = activeTabRef.current;
    const input = textInputRef.current;
    if (!tab || !input.trim() || isAskingRef.current) return;

    const question    = input.trim();
    const { threadId, fileHash } = tab;

    setTextInput('');
    setIsAsking(true);
    appendMessage(threadId, 'user', question);

    try {
      const result = await askText(threadId, question, fileHash);
      appendMessage(
        threadId, 'assistant',
        result.success && result.answer
          ? result.answer
          : result.error ?? 'Something went wrong. Please try again.',
        result.sources, result.success,
      );
    } catch {
      appendMessage(threadId, 'assistant', 'Network error. Please try again.');
    } finally {
      setIsAsking(false);
    }
  }, [appendMessage]);

  // ── Ask: speech mode ───────────────────────────────────────────────────
  const handleSubmitSpeech = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab || !recordedBlob || isAskingRef.current) return;

    const { threadId, fileHash } = tab;
    setIsAsking(true);

    let transcript: string;
    try {
      const stt = await transcribeAudio(recordedBlob);
      if (!stt.success || !stt.transcript) {
        appendMessage(threadId, 'user', '🎤 Voice question');
        appendMessage(threadId, 'assistant', stt.error ?? 'Could not transcribe audio.');
        setIsAsking(false);
        return;
      }
      transcript = stt.transcript;
      appendMessage(threadId, 'user', transcript);
    } catch {
      appendMessage(threadId, 'user', '🎤 Voice question');
      appendMessage(threadId, 'assistant', 'Transcription failed. Please try again.');
      setIsAsking(false);
      return;
    }

    let answerText = '';
    try {
      const result = await askText(threadId, transcript, fileHash);
      if (!result.success || !result.answer) {
        appendMessage(threadId, 'assistant', result.error ?? 'Could not generate an answer.');
        setIsAsking(false);
        return;
      }
      answerText = result.answer;
      appendMessage(threadId, 'assistant', answerText, result.sources, true);
    } catch {
      appendMessage(threadId, 'assistant', 'Something went wrong. Please try again.');
    } finally {
      setIsAsking(false);
    }

    try {
      const spoken = answerText.split('\n\n📄 Sources:')[0];
      const tts    = await streamTtsAudio(spoken);
      if (tts.ok) playStream(tts).catch(() => {});
    } catch { /* silent */ }
  }, [recordedBlob, appendMessage, playStream]);

  return (
    <PdfChatContext.Provider value={{
      tabs, activeThreadId, activeTab,
      showUploadPanel, uploadProgress,
      mode, textInput, isAsking, isSpeaking, isPaused, isRecording, recordedBlob,
      setMode, setTextInput,
      handleUpload, handleSelectTab, handleCloseTab, handleShowUploadPanel,
      handleAskText, handleSubmitSpeech,
      startRecording, stopRecording,
      pauseAudio, resumeAudio, stopAudio,
      markMessageStreamingComplete, restoreFromHistory,
    }}>
      {children}
    </PdfChatContext.Provider>
  );
}

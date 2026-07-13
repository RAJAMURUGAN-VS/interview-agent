import { useState, useCallback, useEffect, useRef } from 'react';
import type { PdfTab, PdfChatMessage, ChatMode, PdfChatHistoryEntry } from '../types';
import {
  uploadPdf, askText, transcribeAudio, streamTtsAudio,
  deleteSession, createSessionFromHash,
} from '../api/pdfChatApi';
import { useAudioStream }   from './useAudioStream';
import { useMediaRecorder } from './useMediaRecorder';
import {
  savePdfChatEntry,
  updatePdfChatEntry,
} from './useHistory';
import {
  usePdfCacheCheck,
  type ChunkData,
} from './usePdfChatIndexedDB';

//
// ── Mental model (ChatGPT / Claude style) ─────────────────────────────────
//
//  • History entry is created ONCE: right when a PDF is uploaded.
//  • History entry is updated IN-PLACE (debounced) as messages arrive.
//  • Closing a tab does NOTHING to history — it's already up-to-date.
//  • Opening from history opens the PDF as a tab (or switches to it).
//
// ──────────────────────────────────────────────────────────────────────────

const SYNC_DEBOUNCE_MS = 400;

export function usePdfChat() {
  const [tabs, setTabs]                     = useState<PdfTab[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isUploading, setIsUploading]         = useState(false);
  const [uploadError, setUploadError]         = useState<string | null>(null);

  const [mode, setMode]           = useState<ChatMode>('text');
  const [textInput, setTextInput] = useState('');
  const [isAsking, setIsAsking]   = useState(false);

  const { isSpeaking, isPaused, playStream, pauseAudio, resumeAudio, stopAudio } = useAudioStream();
  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { checkCache, storeCache } = usePdfCacheCheck();

  const activeTab = tabs.find((t) => t.threadId === activeThreadId) ?? null;

  // ── Debounced history sync ──────────────────────────────────────────────
  // Whenever a tab's messages change, push the update to localStorage so
  // history is always fresh. Closing the tab does NOT touch history at all.
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

  // Watch for message changes on any tab → sync to history
  const prevTabsRef = useRef<PdfTab[]>([]);
  useEffect(() => {
    tabs.forEach((tab) => {
      const prev = prevTabsRef.current.find((t) => t.threadId === tab.threadId);
      if (!prev || prev.messages.length !== tab.messages.length) {
        syncTabToHistory(tab);
      }
    });
    prevTabsRef.current = tabs;
  }, [tabs, syncTabToHistory]);

  // ── Append a message to a tab ───────────────────────────────────────────
  const appendMessage = useCallback(
    (threadId: string, role: 'user' | 'assistant', text: string, sources?: number[], isStreaming?: boolean) => {
      const newMsg: PdfChatMessage = { id: crypto.randomUUID(), role, text, sources, isStreaming };
      setTabs((prev) =>
        prev.map((t) => t.threadId === threadId ? { ...t, messages: [...t.messages, newMsg] } : t),
      );
    },
    [],
  );

  const markMessageStreamingComplete = useCallback((threadId: string, messageId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.threadId !== threadId ? t : {
          ...t,
          messages: t.messages.map((m) => m.id === messageId ? { ...m, isStreaming: false } : m),
        },
      ),
    );
  }, []);

  // ── Upload PDF ──────────────────────────────────────────────────────────
  // History entry is created HERE — once. Subsequent messages update it.
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    let result: Awaited<ReturnType<typeof uploadPdf>>;
    let resolvedHash = '';

    try {
      const cacheResult = await checkCache(file);
      resolvedHash = cacheResult.fileHash;

      if (cacheResult.hit) {
        const fromHash = await createSessionFromHash(cacheResult.record.fileHash, file.name);
        if (fromHash.success && fromHash.thread_id) {
          result = { success: true, thread_id: fromHash.thread_id, file_hash: cacheResult.record.fileHash };
        } else {
          result = await uploadPdf(file);
        }
      } else {
        result = await uploadPdf(file);
      }
    } catch {
      try { result = await uploadPdf(file); }
      catch {
        setIsUploading(false);
        setUploadError('Upload failed. Please try again.');
        return;
      }
    }

    setIsUploading(false);

    if (!result.success || !result.thread_id || !result.file_hash) {
      setUploadError(result.error ?? 'Upload failed. Please try again.');
      return;
    }

    // ── Create history entry immediately (0 messages) ──────────────────────
    const historyEntryId = crypto.randomUUID();
    savePdfChatEntry({
      id:           historyEntryId,
      savedAt:      new Date().toISOString(),
      fileName:     file.name,
      fileHash:     result.file_hash,
      messageCount: 0,
      messages:     [],
    });

    const newTab: PdfTab = {
      threadId:       result.thread_id,
      fileHash:       result.file_hash,
      fileName:       file.name,
      messages:       [],
      startedAt:      new Date().toISOString(),
      historyEntryId,               // ← links tab to its history entry permanently
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveThreadId(result.thread_id);
    setShowUploadPanel(false);
    setUploadError(null);

    // Cache hash in IDB for next time
    if (resolvedHash && result.file_hash) {
      storeCache(file, resolvedHash, result.thread_id, [] as ChunkData[]).catch(() => {});
    }
  }, [checkCache, storeCache]);

  // ── Switch active tab ───────────────────────────────────────────────────
  const handleSelectTab = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setShowUploadPanel(false);
    setTextInput('');
  }, []);

  // ── Close tab ───────────────────────────────────────────────────────────
  // History is already kept in sync by syncTabToHistory, so we do NOTHING
  // history-related here. Just remove the tab and clean up.
  const handleCloseTab = useCallback((threadId: string) => {
    // Cancel any pending sync for this tab
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

    // Best-effort backend cleanup
    deleteSession(threadId).catch(() => {});
  }, []);

  // ── Show upload panel ───────────────────────────────────────────────────
  const handleShowUploadPanel = useCallback(() => {
    setShowUploadPanel(true);
    setUploadError(null);
  }, []);

  // ── Open a history entry as a tab ──────────────────────────────────────
  // If the entry is already open as a tab → just switch to it (same memory).
  // Otherwise → restore backend session + open the tab linked to same entry id.
  const restoreFromHistory = useCallback(async (entry: PdfChatHistoryEntry) => {
    // Already open? Switch to it — same thread, same memory.
    const existing = tabs.find((t) => t.historyEntryId === entry.id);
    if (existing) {
      setActiveThreadId(existing.threadId);
      setShowUploadPanel(false);
      return;
    }

    // Try to recover the ChromaDB session so the user can keep asking questions
    let threadId = `view_${crypto.randomUUID().slice(0, 8)}`;
    if (entry.fileHash) {
      try {
        const res = await createSessionFromHash(entry.fileHash, entry.fileName);
        if (res.success && res.thread_id) threadId = res.thread_id;
      } catch { /* continue — messages still visible, user just can't ask new ones */ }
    }

    const messages: PdfChatMessage[] = entry.messages.map((m) => ({ ...m, isStreaming: false }));

    // Link tab to the SAME history entry — any new messages will update it in-place
    const restoredTab: PdfTab = {
      threadId,
      fileHash:        entry.fileHash ?? '',
      fileName:        entry.fileName,
      messages,
      startedAt:       new Date().toISOString(),
      historyEntryId:  entry.id,
    };

    setTabs((prev) => [...prev, restoredTab]);
    setActiveThreadId(threadId);
    setShowUploadPanel(false);
  }, [tabs]);

  // ── Refs (avoid stale closures in async callbacks) ──────────────────────
  const activeTabRef  = useRef(activeTab);  activeTabRef.current  = activeTab;
  const textInputRef  = useRef(textInput);  textInputRef.current  = textInput;
  const isAskingRef   = useRef(isAsking);   isAskingRef.current   = isAsking;

  // ── Ask: text mode ──────────────────────────────────────────────────────
  const handleAskText = useCallback(async () => {
    const tab   = activeTabRef.current;
    const input = textInputRef.current;
    if (!tab || !input.trim() || isAskingRef.current) return;

    const question   = input.trim();
    const { threadId } = tab;

    setTextInput('');
    setIsAsking(true);
    appendMessage(threadId, 'user', question);

    try {
      const result = await askText(threadId, question);
      appendMessage(
        threadId, 'assistant',
        result.success && result.answer
          ? result.answer
          : result.error ?? 'Something went wrong. Please try again.',
        result.sources,
        result.success,
      );
    } catch {
      appendMessage(threadId, 'assistant', 'Network error. Please try again.');
    } finally {
      setIsAsking(false);
    }
  }, [appendMessage]);

  // ── Ask: speech mode ────────────────────────────────────────────────────
  const handleSubmitSpeech = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab || !recordedBlob || isAskingRef.current) return;

    const { threadId } = tab;
    setIsAsking(true);

    // STT
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

    // RAG answer
    let answerText = '';
    try {
      const result = await askText(threadId, transcript);
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

    // TTS (non-blocking)
    try {
      const spoken = answerText.split('\n\n📄 Sources:')[0];
      const tts    = await streamTtsAudio(spoken);
      if (tts.ok) playStream(tts).catch(() => {});
    } catch { /* silent */ }
  }, [recordedBlob, appendMessage, playStream]);

  return {
    tabs, activeThreadId, activeTab,
    showUploadPanel, isUploading, uploadError,
    mode, textInput, isAsking, isSpeaking, isPaused, isRecording, recordedBlob,
    setMode, setTextInput,
    handleUpload, handleSelectTab, handleCloseTab, handleShowUploadPanel,
    handleAskText, handleSubmitSpeech,
    startRecording, stopRecording,
    pauseAudio, resumeAudio, stopAudio,
    markMessageStreamingComplete,
    restoreFromHistory,
  };
}

import { useState, useCallback } from 'react';
import type { PdfTab, PdfChatMessage, ChatMode } from '../types';
import { uploadPdf, askText, askSpeech, deleteSession } from '../api/pdfChatApi';
import { useAudioStream } from './useAudioStream';
import { useMediaRecorder } from './useMediaRecorder';

export function usePdfChat() {
  // ── Tab state ────────────────────────────────────────────────────────────
  const [tabs, setTabs]                     = useState<PdfTab[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // ── Upload panel state ───────────────────────────────────────────────────
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isUploading, setIsUploading]         = useState(false);
  const [uploadError, setUploadError]         = useState<string | null>(null);

  // ── Chat input state ─────────────────────────────────────────────────────
  const [mode, setMode]           = useState<ChatMode>('text');
  const [textInput, setTextInput] = useState('');
  const [isAsking, setIsAsking]   = useState(false);

  const { isSpeaking, playStream }  = useAudioStream();
  const { isRecording, recordedBlob, startRecording, stopRecording } =
    useMediaRecorder();

  // ── Derived: active tab object ───────────────────────────────────────────
  const activeTab = tabs.find((t) => t.threadId === activeThreadId) ?? null;

  // ── Helper: append a message to a specific tab ───────────────────────────
  const appendMessage = useCallback(
    (threadId: string, role: 'user' | 'assistant', text: string) => {
      const newMessage: PdfChatMessage = {
        id: crypto.randomUUID(),
        role,
        text,
      };
      setTabs((prev) =>
        prev.map((tab) =>
          tab.threadId === threadId
            ? { ...tab, messages: [...tab.messages, newMessage] }
            : tab,
        ),
      );
    },
    [],
  );

  // ── Upload a new PDF → create new tab ────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    const result = await uploadPdf(file);
    setIsUploading(false);

    if (!result.success || !result.thread_id || !result.file_hash) {
      setUploadError(result.error ?? 'Upload failed. Please try again.');
      return;
    }

    const newTab: PdfTab = {
      threadId: result.thread_id,
      fileHash: result.file_hash,
      fileName: file.name,
      messages: [],
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveThreadId(result.thread_id);
    setShowUploadPanel(false); // collapse upload area after success
    setUploadError(null);
  }, []);

  // ── Switch active tab ─────────────────────────────────────────────────────
  const handleSelectTab = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setShowUploadPanel(false);
    setTextInput('');
  }, []);

  // ── Close a tab ───────────────────────────────────────────────────────────
  const handleCloseTab = useCallback(
    (threadId: string) => {
      // Tell backend to free memory — fire and forget
      deleteSession(threadId);

      setTabs((prev) => {
        const remaining = prev.filter((t) => t.threadId !== threadId);

        // Determine next active tab
        if (activeThreadId === threadId) {
          const closedIndex = prev.findIndex((t) => t.threadId === threadId);
          const nextTab =
            remaining[closedIndex] ??     // tab to the right
            remaining[closedIndex - 1] ?? // tab to the left
            null;
          setActiveThreadId(nextTab?.threadId ?? null);
        }

        return remaining;
      });
    },
    [activeThreadId],
  );

  // ── Open upload panel (from "+ Add PDF" button) ───────────────────────────
  const handleShowUploadPanel = useCallback(() => {
    setShowUploadPanel(true);
    setUploadError(null);
    setActiveThreadId(null); // deselect current tab while uploading
  }, []);

  // ── Ask: text mode ────────────────────────────────────────────────────────
  const handleAskText = useCallback(async () => {
    if (!activeTab || !textInput.trim() || isAsking) return;

    const question = textInput.trim();
    const { threadId } = activeTab;
    setTextInput('');
    appendMessage(threadId, 'user', question);
    setIsAsking(true);

    const result = await askText(threadId, question);
    setIsAsking(false);

    appendMessage(
      threadId,
      'assistant',
      result.success && result.answer
        ? result.answer
        : result.error ?? 'Something went wrong. Please try again.',
    );
  }, [activeTab, textInput, isAsking, appendMessage]);

  // ── Ask: speech mode ──────────────────────────────────────────────────────
  const handleSubmitSpeech = useCallback(async () => {
    if (!activeTab || !recordedBlob || isAsking) return;

    const { threadId } = activeTab;
    setIsAsking(true);
    appendMessage(threadId, 'user', '🎤 Voice question');

    const { response, answerText } = await askSpeech(threadId, recordedBlob);

    if (answerText) {
      appendMessage(threadId, 'assistant', answerText);
    }

    playStream(response);
    setIsAsking(false);
  }, [activeTab, recordedBlob, isAsking, appendMessage, playStream]);

  return {
    // Tab state
    tabs,
    activeThreadId,
    activeTab,
    // Upload panel
    showUploadPanel,
    isUploading,
    uploadError,
    // Chat input
    mode,
    textInput,
    isAsking,
    isSpeaking,
    isRecording,
    recordedBlob,
    // Setters
    setMode,
    setTextInput,
    // Actions
    handleUpload,
    handleSelectTab,
    handleCloseTab,
    handleShowUploadPanel,
    handleAskText,
    handleSubmitSpeech,
    startRecording,
    stopRecording,
  };
}

import { useState, useCallback } from 'react';
import type { PdfChatMessage, ChatMode } from '../types';
import { uploadPdf, askText, askSpeech } from '../api/pdfChatApi';
import { useAudioStream } from './useAudioStream';
import { useMediaRecorder } from './useMediaRecorder';

export function usePdfChat() {
  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PdfChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>('text');
  const [fileName, setFileName] = useState<string>('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Ask state
  const [isAsking, setIsAsking] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Audio hooks
  const { isSpeaking, playStream } = useAudioStream();
  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();

  /**
   * Upload a PDF file and initialize a new session.
   * Clears previous messages and resets mode to 'text'.
   */
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadPdf(file);
      
      if (response.session_id) {
        setSessionId(response.session_id);
        setFileName(file.name);
        setMessages([]);
        setMode('text');
        setUploadError(null);
      } else {
        setUploadError(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Submit a text question to the RAG pipeline.
   * Appends user and assistant messages to the chat history.
   */
  const handleAskText = useCallback(async () => {
    if (!sessionId || !textInput.trim()) return;

    const question = textInput.trim();
    setTextInput('');
    setIsAsking(true);

    // Append user message
    const userMessage: PdfChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await askText(sessionId, question);

      if (response.answer) {
        const assistantMessage: PdfChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.answer,
          sources: response.sources || [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: PdfChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.error || 'Failed to get answer',
          sources: [],
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: PdfChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Failed to get answer',
        sources: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  }, [sessionId, textInput]);

  /**
   * Submit a recorded speech question to the RAG pipeline.
   * Streams audio response and displays the answer text with sources.
   */
  const handleSubmitSpeech = useCallback(async () => {
    if (!sessionId || !recordedBlob) return;

    setIsAsking(true);

    // Append user message with voice indicator
    const userMessage: PdfChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: '🎤 Voice question',
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await askSpeech(sessionId, recordedBlob);

      // Extract answer text from header
      const answerText = response.headers.get('X-Answer-Text') || 'No answer received';
      
      // Extract sources from header if present
      const sourcesHeader = response.headers.get('X-Answer-Sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];

      // Append assistant message with answer text and sources
      const assistantMessage: PdfChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answerText,
        sources: sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Play the audio stream
      await playStream(response);
    } catch (error) {
      const errorMessage: PdfChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Failed to process speech question',
        sources: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  }, [sessionId, recordedBlob, playStream]);

  /**
   * Reset the entire chat session.
   * Clears session ID, messages, errors, and resets mode to 'text'.
   */
  const handleReset = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setMode('text');
    setFileName('');
    setUploadError(null);
    setTextInput('');
  }, []);

  return {
    // State
    sessionId,
    isUploading,
    uploadError,
    messages,
    mode,
    textInput,
    isAsking,
    isSpeaking,
    isRecording,
    recordedBlob,
    fileName,

    // Setters
    setMode,
    setTextInput,

    // Actions
    handleUpload,
    handleAskText,
    handleSubmitSpeech,
    startRecording,
    stopRecording,
    handleReset,
  };
}

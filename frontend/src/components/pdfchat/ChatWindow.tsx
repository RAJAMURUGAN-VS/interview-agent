import { useEffect, useRef } from 'react';
import type { PdfChatMessage, ChatMode } from '../../types';
import ChatMessage from './ChatMessage';
import ModeToggle from './ModeToggle';
import RecordButton from '../interview/RecordButton';

interface Props {
  messages: PdfChatMessage[];
  mode: ChatMode;
  textInput: string;
  isAsking: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  onModeChange: (mode: ChatMode) => void;
  onTextChange: (v: string) => void;
  onAskText: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitSpeech: () => void;
  onPauseAudio: () => void;
  onResumeAudio: () => void;
  onStopAudio: () => void;
  onStreamingComplete?: (id: string) => void;
}

export default function ChatWindow({
  messages, mode, textInput, isAsking, isSpeaking, isPaused, isRecording,
  recordedBlob, onModeChange, onTextChange, onAskText,
  onStartRecording, onStopRecording, onSubmitSpeech,
  onPauseAudio, onResumeAudio, onStopAudio,
  onStreamingComplete,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrolledMessageIdRef = useRef<string | null>(null);
  const prevMessagesCountRef = useRef(messages.length);

  useEffect(() => {
    if (!containerRef.current) return;

    const currentCount = messages.length;
    const prevCount = prevMessagesCountRef.current;
    prevMessagesCountRef.current = currentCount;

    if (currentCount === 0) return;

    const lastMessage = messages[currentCount - 1];

    if (currentCount > prevCount) {
      if (lastMessage.role === 'user') {
        // User message: scroll all the way to the bottom
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else if (lastMessage.role === 'assistant' && lastMessage.id !== scrolledMessageIdRef.current) {
        // Assistant message: scroll the top of this message into view once when it starts
        scrolledMessageIdRef.current = lastMessage.id;
        
        setTimeout(() => {
          const items = containerRef.current?.querySelectorAll('.message-item');
          if (items && items.length > 0) {
            const lastItem = items[items.length - 1] as HTMLElement;
            lastItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 80);
      }
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAskText();
    }
  };

  return (
    <div className="card flex flex-col gap-4" style={{ minHeight: '480px' }}>

      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a] font-medium">
          Chat
        </p>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>

      {/* Message list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
        style={{ maxHeight: '320px' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full
            gap-2 text-center py-10">
            <i className="fas fa-comments text-[#2a2a3d] text-3xl" />
            <p className="text-sm text-[#4a4a6a]">
              Ask anything about your PDF
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="message-item">
            <ChatMessage message={msg} onStreamingComplete={onStreamingComplete} />
          </div>
        ))}
        {isAsking && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[#1c1c27] border
              border-[#2a2a3d] flex items-center justify-center text-xs
              text-[#8b8ba8] flex-shrink-0">
              <i className="fas fa-robot" />
            </div>
            <div className="bg-[#1c1c27] border border-[#2a2a3d] rounded-2xl
              rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4f46e5] rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#4f46e5] rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#4f46e5] rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#2a2a3d] pt-4">

        {/* TEXT MODE */}
        {mode === 'text' && (
          <div className="flex gap-3 items-end">
            <textarea
              value={textInput}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAsking}
              placeholder="Ask a question… (Enter to send)"
              rows={2}
              className="flex-1 bg-[#1c1c27] border border-[#2a2a3d]
                focus:border-[#4f46e5] rounded-xl px-4 py-3 text-sm
                text-[#f0f0ff] placeholder-[#4a4a6a] resize-none
                outline-none transition-colors duration-200
                disabled:opacity-40"
            />
            <button
              onClick={onAskText}
              disabled={isAsking || !textInput.trim()}
              className="w-10 h-10 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
                flex items-center justify-center flex-shrink-0
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
                hover:shadow-[0_0_12px_rgba(79,70,229,0.4)]"
            >
              <i className="fas fa-paper-plane text-white text-sm" />
            </button>
          </div>
        )}

        {/* SPEECH MODE */}
        {mode === 'speech' && (
          <div className="flex flex-col items-center gap-4">
            {isSpeaking && (
              <div className="flex items-center gap-4 bg-[#1c1c27] border border-[#2a2a3d] px-4 py-2 rounded-xl shadow-md animate-fade-in">
                <div className="flex items-center gap-2 text-xs text-[#8b8ba8]">
                  <i className="fas fa-volume-up text-[#4f46e5] animate-pulse" />
                  <span>{isPaused ? 'Audio paused' : 'Playing answer…'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <button
                      onClick={onResumeAudio}
                      title="Resume"
                      className="w-8 h-8 rounded-lg bg-[#2a2a3d] hover:bg-[#3a3a52] text-[#f0f0ff] flex items-center justify-center transition-colors"
                    >
                      <i className="fas fa-play text-xs" />
                    </button>
                  ) : (
                    <button
                      onClick={onPauseAudio}
                      title="Pause"
                      className="w-8 h-8 rounded-lg bg-[#2a2a3d] hover:bg-[#3a3a52] text-[#f0f0ff] flex items-center justify-center transition-colors"
                    >
                      <i className="fas fa-pause text-xs" />
                    </button>
                  )}
                  <button
                    onClick={onStopAudio}
                    title="Stop"
                    className="w-8 h-8 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors"
                  >
                    <i className="fas fa-stop text-xs" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <RecordButton
                  isRecording={isRecording}
                  disabled={false}
                  onClick={isRecording ? onStopRecording : onStartRecording}
                />
                <p className="text-[10px] text-[#4a4a6a]">
                  {isRecording ? 'Stop' : 'Record'}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={onSubmitSpeech}
                  disabled={!recordedBlob || isRecording}
                  className="w-12 h-12 rounded-full bg-[#4f46e5] hover:bg-[#4338ca]
                    flex items-center justify-center text-white transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                >
                  <i className="fas fa-paper-plane text-sm" />
                </button>
                <p className="text-[10px] text-[#4a4a6a]">Send</p>
              </div>
            </div>
            <p className="text-xs text-[#4a4a6a]">
              {isRecording
                ? 'Recording… click to stop'
                : isSpeaking
                ? 'Listening to answer…'
                : 'Click to record your voice question'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

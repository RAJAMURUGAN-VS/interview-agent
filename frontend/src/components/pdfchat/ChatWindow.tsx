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
  isRecording: boolean;
  recordedBlob: Blob | null;
  onModeChange: (mode: ChatMode) => void;
  onTextChange: (v: string) => void;
  onAskText: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitSpeech: () => void;
}

export default function ChatWindow({
  messages, mode, textInput, isAsking, isSpeaking, isRecording,
  recordedBlob, onModeChange, onTextChange, onAskText,
  onStartRecording, onStopRecording, onSubmitSpeech,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isAsking && !isSpeaking && (
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
              <div className="flex items-center gap-2 text-xs text-[#8b8ba8]">
                <i className="fas fa-volume-up text-[#4f46e5]" />
                Playing answer…
              </div>
            )}
            <RecordButton
              isRecording={isRecording}
              disabled={isAsking || isSpeaking}
              onClick={isRecording ? onStopRecording : onStartRecording}
            />
            <p className="text-xs text-[#4a4a6a]">
              {isRecording
                ? 'Recording… click to stop'
                : isSpeaking
                ? 'Listening to answer…'
                : 'Click to ask a question'}
            </p>
            {recordedBlob && !isRecording && !isAsking && (
              <button
                onClick={onSubmitSpeech}
                className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
                  text-white text-sm font-semibold transition-all duration-200"
              >
                <i className="fas fa-paper-plane mr-2" />Send
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

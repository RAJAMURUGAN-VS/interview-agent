import type { PdfChatMessage } from '../../types';
import StreamingMarkdown from './StreamingMarkdown';

interface Props {
  message: PdfChatMessage;
  onStreamingComplete?: (id: string) => void;
}

export default function ChatMessage({ message, onStreamingComplete }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      {isUser ? (
        <div
          aria-label="You"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f46e5]
            flex items-center justify-center text-white text-xs font-semibold"
        >
          You
        </div>
      ) : (
        <div
          aria-label="Assistant"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1c1c27]
            border border-[#2a2a3d] flex items-center justify-center"
        >
          <i className="fas fa-robot text-[#8b8ba8] text-sm" aria-hidden="true" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={
            isUser
              ? 'bg-[#4f46e5] text-white rounded-2xl rounded-tr-sm px-4 py-2.5'
              : 'bg-[#1c1c27] border border-[#2a2a3d] text-[#8b8ba8] rounded-2xl rounded-tl-sm px-4 py-2.5'
          }
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
          ) : (
            <StreamingMarkdown
              content={message.text}
              isStreamingActive={!!message.isStreaming}
              onComplete={() => onStreamingComplete?.(message.id)}
            />
          )}
        </div>

        {/* Citation badges — only on assistant messages with sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.sources.map((page) => (
              <span
                key={page}
                className="inline-flex items-center px-2 py-0.5 rounded-full
                  text-xs font-medium bg-[#2a2a3d] text-[#8b8ba8]
                  border border-[#3a3a5c]"
              >
                Page {page}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

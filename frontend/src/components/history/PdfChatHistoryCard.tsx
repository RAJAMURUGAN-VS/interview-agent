import { useState } from 'react';
import type { PdfChatHistoryEntry } from '../../types';

interface Props {
  entry: PdfChatHistoryEntry;
  onDelete: (id: string) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PdfChatHistoryCard({ entry, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#2a2a3d] rounded-xl overflow-hidden
      bg-[#13131a]">

      {/* Header row */}
      <div className="flex items-start justify-between px-4 py-3 gap-3">
        <button
          className="flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <i className="fas fa-file-pdf text-[#ef4444] text-sm" />
            <span className="text-sm font-semibold text-[#f0f0ff] truncate">
              {entry.fileName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#4a4a6a]">
            <span>
              <i className="fas fa-message mr-1" />
              {entry.messageCount} messages
            </span>
            <span>{relativeTime(entry.savedAt)}</span>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[#4a4a6a] hover:text-[#f0f0ff] hover:bg-[#1c1c27]
              transition-all duration-150"
            aria-label="Expand"
          >
            <i className={`fas fa-chevron-down text-[10px] transition-transform
              duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[#4a4a6a] hover:text-[#ef4444] hover:bg-[#ef4444]/10
              transition-all duration-150"
            aria-label="Delete"
          >
            <i className="fas fa-trash text-[10px]" />
          </button>
        </div>
      </div>

      {/* Expanded content — conversation preview */}
      {expanded && (
        <div className="border-t border-[#2a2a3d] px-4 py-4 bg-[#1c1c27]
          flex flex-col gap-3 animate-fade-in">

          <p className="text-[10px] uppercase tracking-widest
            text-[#4a4a6a] font-medium">
            Conversation
          </p>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {entry.messages.length === 0 ? (
              <p className="text-xs text-[#4a4a6a] text-center py-2">
                No messages
              </p>
            ) : (
              entry.messages.map((msg, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-lg
                  leading-relaxed
                  ${msg.role === 'assistant'
                    ? 'bg-[#4f46e5]/8 border border-[#4f46e5]/15 text-[#8b8ba8]'
                    : 'bg-[#2a2a3d]/50 text-[#8b8ba8]'}`}>
                  <span className="font-semibold text-[#4a4a6a] mr-1.5">
                    {msg.role === 'assistant' ? '🤖 AI:' : '👤 You:'}
                  </span>
                  <span className="break-words line-clamp-2">
                    {msg.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

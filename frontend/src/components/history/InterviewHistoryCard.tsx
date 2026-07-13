import { useState } from 'react';
import type { InterviewHistoryEntry } from '../../types';

interface Props {
  entry: InterviewHistoryEntry;
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

const SAVE_TYPE_LABEL: Record<string, string> = {
  conversation: 'Conversation',
  feedback: 'Feedback',
  both: 'Conversation + Feedback',
};

export default function InterviewHistoryCard({ entry, onDelete }: Props) {
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
            <span className="text-sm font-semibold text-[#f0f0ff]">
              {entry.subject}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md
              bg-[#4f46e5]/10 border border-[#4f46e5]/20 text-[#4f46e5]
              font-medium">
              {entry.department}
            </span>
            {entry.score !== null && (
              <span className="text-[10px] px-2 py-0.5 rounded-md
                bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]
                font-medium">
                Score {entry.score}/5
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#4a4a6a]">
            <span>
              <i className="fas fa-floppy-disk mr-1" />
              {SAVE_TYPE_LABEL[entry.saveType]}
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

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#2a2a3d] px-4 py-4 bg-[#1c1c27]
          flex flex-col gap-4 animate-fade-in">

          {/* Conversation */}
          {entry.conversation && entry.conversation.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest
                text-[#4a4a6a] font-medium mb-2">
                Conversation
              </p>
              <div className="flex flex-col gap-2">
                {entry.conversation.map((msg, i) => (
                  <div key={i} className={`text-xs px-3 py-2 rounded-lg
                    leading-relaxed
                    ${msg.role === 'interviewer'
                      ? 'bg-[#4f46e5]/8 border border-[#4f46e5]/15 text-[#8b8ba8]'
                      : 'bg-[#2a2a3d]/50 text-[#8b8ba8]'}`}>
                    <span className="font-semibold text-[#4a4a6a] mr-1.5">
                      {msg.role === 'interviewer' ? '🤖 Natalie:' : '👤 You:'}
                    </span>
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {entry.feedback && (
            <div>
              <p className="text-[10px] uppercase tracking-widest
                text-[#4a4a6a] font-medium mb-2">
                Feedback
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#f0f0ff]">
                    {entry.feedback.candidate_score}
                    <span className="text-sm text-[#4a4a6a]">/5</span>
                  </span>
                </div>
                <p className="text-xs text-[#8b8ba8] leading-relaxed">
                  {entry.feedback.feedback}
                </p>
                {entry.feedback.areas_of_improvement && (
                  <p className="text-xs text-[#f59e0b] leading-relaxed">
                    <i className="fas fa-arrow-up-right-dots mr-1" />
                    {entry.feedback.areas_of_improvement}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

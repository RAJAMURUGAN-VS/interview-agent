import { useState } from 'react';
import type { McqHistoryEntry } from '../../types';

interface Props {
  entry: McqHistoryEntry;
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

const GRADE_COLOR: Record<string, string> = {
  'Excellent':      'text-[#22c55e]',
  'Good':           'text-[#3b82f6]',
  'Needs Revision': 'text-[#f59e0b]',
  'Poor':           'text-[#ef4444]',
};

export default function McqHistoryCard({ entry, onDelete }: Props) {
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
              {entry.topic}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md
              bg-[#4f46e5]/10 border border-[#4f46e5]/20 text-[#4f46e5]
              font-medium">
              {entry.questionType === 'mcq' ? 'MCQ' : 'Fill-up'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md
              border font-medium
              ${GRADE_COLOR[entry.grade] === 'text-[#22c55e]'
                ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
                : GRADE_COLOR[entry.grade] === 'text-[#3b82f6]'
                ? 'bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]'
                : GRADE_COLOR[entry.grade] === 'text-[#f59e0b]'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'}`}>
              {entry.grade}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#4a4a6a]">
            <span>
              <i className="fas fa-score mr-1" />
              {entry.score}/{entry.total}
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

          {/* Summary */}
          {entry.feedback && (
            <div>
              <p className="text-[10px] uppercase tracking-widest
                text-[#4a4a6a] font-medium mb-2">
                AI Summary
              </p>
              <p className="text-xs text-[#8b8ba8] leading-relaxed">
                {entry.feedback.summary}
              </p>
            </div>
          )}

          {/* Weak areas */}
          {entry.feedback?.weak_areas && entry.feedback.weak_areas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest
                text-[#f59e0b] font-medium mb-2">
                <i className="fas fa-triangle-exclamation mr-1" />
                Focus Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.feedback.weak_areas.map((area) => (
                  <span key={area}
                    className="text-xs px-3 py-1 rounded-lg
                      bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] font-medium">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-question review */}
          {entry.answers && entry.answers.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest
                text-[#4a4a6a] font-medium mb-2">
                Question Review
              </p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {entry.answers.map((ans, i) => {
                  const question = entry.questions.find((q) => q.id === ans.question_id);
                  if (!question) return null;
                  return (
                    <div key={ans.question_id} className={`text-xs px-3 py-2 rounded-lg
                      leading-relaxed flex items-center gap-2
                      ${ans.is_correct
                        ? 'bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#8b8ba8]'
                        : 'bg-[#ef4444]/8 border border-[#ef4444]/15 text-[#8b8ba8]'}`}>
                      <i className={`fas ${ans.is_correct ? 'fa-check' : 'fa-xmark'} text-[10px]
                        ${ans.is_correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`} />
                      <span className="flex-1">Q{i + 1}: {ans.is_correct ? 'Correct ✓' : 'Wrong ✗'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

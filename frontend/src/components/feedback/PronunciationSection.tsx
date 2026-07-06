import { useState } from 'react';
import type { PronunciationFeedback } from '../../types';

interface Props {
  data: PronunciationFeedback;
}

export default function PronunciationSection({ data }: Props) {
  const [openAnswer, setOpenAnswer] = useState<number | null>(null);

  const totalFillers = data.per_answer.reduce((sum, a) => sum + a.filler_count, 0);
  const totalPauses  = data.per_answer.reduce((sum, a) => sum + a.long_pause_count, 0);

  const fluencyLabel =
    totalFillers + totalPauses === 0 ? 'Excellent' :
    totalFillers + totalPauses <= 3  ? 'Good'      :
    totalFillers + totalPauses <= 7  ? 'Fair'      : 'Needs Work';

  const fluencyColor =
    fluencyLabel === 'Excellent' ? 'text-[#22c55e]' :
    fluencyLabel === 'Good'      ? 'text-[#3b82f6]' :
    fluencyLabel === 'Fair'      ? 'text-[#f59e0b]' : 'text-[#ef4444]';

  return (
    <div className="card">

      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-microphone-lines text-[#4f46e5] text-xs" />
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium">
          Pronunciation Analysis
        </p>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#1c1c27] border border-[#2a2a3d] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#f0f0ff]">{totalFillers}</p>
          <p className="text-xs text-[#8b8ba8] mt-0.5">Fillers Used</p>
        </div>
        <div className="bg-[#1c1c27] border border-[#2a2a3d] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#f0f0ff]">{totalPauses}</p>
          <p className="text-xs text-[#8b8ba8] mt-0.5">Long Pauses</p>
        </div>
        <div className="bg-[#1c1c27] border border-[#2a2a3d] rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${fluencyColor}`}>{fluencyLabel}</p>
          <p className="text-xs text-[#8b8ba8] mt-0.5">Fluency</p>
        </div>
      </div>

      {/* LLM summary */}
      <p className="text-sm text-[#c8c8d8] leading-relaxed mb-5">
        {data.summary}
      </p>

      {/* Per-answer accordion */}
      <div className="space-y-2 mb-5">
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a] font-medium mb-2">
          Per Answer Breakdown
        </p>
        {data.per_answer.map((ans) => {
          const isOpen    = openAnswer === ans.answer_number;
          const hasFiller = ans.filler_count > 0;
          const hasPause  = ans.long_pause_count > 0;
          const isClean   = !hasFiller && !hasPause;

          return (
            <div key={ans.answer_number}
              className="border border-[#2a2a3d] rounded-xl overflow-hidden">

              <button
                onClick={() => setOpenAnswer(isOpen ? null : ans.answer_number)}
                className="w-full flex items-center justify-between px-4 py-3
                  text-left hover:bg-[#1c1c27] transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#4f46e5]
                    bg-[#4f46e5]/10 border border-[#4f46e5]/20 px-2 py-0.5 rounded-md">
                    Q{ans.answer_number}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#8b8ba8]">
                    {hasFiller && (
                      <span className="flex items-center gap-1">
                        <i className="fas fa-comment-dots text-[#f59e0b]" />
                        {ans.filler_count} filler{ans.filler_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hasPause && (
                      <span className="flex items-center gap-1">
                        <i className="fas fa-pause text-[#ef4444]" />
                        {ans.long_pause_count} pause{ans.long_pause_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isClean && (
                      <span className="flex items-center gap-1 text-[#22c55e]">
                        <i className="fas fa-circle-check" />
                        Clean delivery
                      </span>
                    )}
                  </div>
                </div>
                <i className={`fas fa-chevron-down text-[#4a4a6a] text-xs
                  transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-[#1c1c27]
                  border-t border-[#2a2a3d] animate-fade-in">
                  {hasFiller && (
                    <div className="mb-3">
                      <p className="text-xs text-[#4a4a6a] mb-2">Fillers detected:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ans.fillers_used.map((fw) => (
                          <span key={fw}
                            className="text-xs px-2 py-0.5 rounded-md
                              bg-[#f59e0b]/10 border border-[#f59e0b]/20
                              text-[#f59e0b] font-medium">
                            "{fw}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-[#8b8ba8] leading-relaxed">{ans.note}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a] font-medium mb-3">
          <i className="fas fa-lightbulb mr-1.5 text-[#f59e0b]" />
          Tips to Improve
        </p>
        <ul className="space-y-2">
          {data.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm
              text-[#c8c8d8] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full
                bg-[#4f46e5]/10 border border-[#4f46e5]/20
                flex items-center justify-center text-[10px]
                font-bold text-[#4f46e5] mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

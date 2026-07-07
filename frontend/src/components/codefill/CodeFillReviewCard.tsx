import type { CfQuestion, CfAnswerRecord } from '../../types';

interface Props {
  question: CfQuestion;
  record:   CfAnswerRecord;
  index:    number;
  isOpen:   boolean;
  onToggle: () => void;
}

export default function CodeFillReviewCard({ question, record, index, isOpen, onToggle }: Props) {
  const statusIcon = record.skipped
    ? 'fas fa-forward text-[#8b8ba8]'
    : record.is_correct
    ? 'fas fa-circle-check text-[#22c55e]'
    : 'fas fa-circle-xmark text-[#ef4444]';

  const statusLabel = record.skipped ? 'Skipped'
    : record.is_correct ? 'Correct' : 'Wrong';

  return (
    <div className="border border-[#2a2a3d] rounded-xl overflow-hidden">

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3
          text-left hover:bg-[#1c1c27] transition-colors duration-150 gap-2"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs font-semibold text-[#4f46e5] flex-shrink-0
            bg-[#4f46e5]/10 border border-[#4f46e5]/20 px-2 py-0.5 rounded-md">
            Q{index + 1}
          </span>
          <i className={`${statusIcon} flex-shrink-0`} />
          <span className="text-sm text-[#f0f0ff] font-medium truncate">
            {question.prompt}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {record.hint_used && (
            <span className="text-xs text-[#f59e0b] hidden sm:block">
              <i className="fas fa-lightbulb mr-1" />hint used
            </span>
          )}
          <span className={`text-xs font-medium
            ${record.skipped ? 'text-[#8b8ba8]'
              : record.is_correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {statusLabel}
          </span>
          <i className={`fas fa-chevron-down text-[#4a4a6a] text-xs
            transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 bg-[#1c1c27] border-t border-[#2a2a3d]
          animate-fade-in flex flex-col gap-3">

          {/* Code with correct answers substituted */}
          <div className="rounded-lg border border-[#2a2a3d] bg-[#0a0a0f]
            p-4 text-xs font-mono leading-6 text-[#c9d1d9]
            whitespace-pre-wrap overflow-x-auto">
            {question.code_template.replace(
              /____BLANK_(\d+)____/g,
              (_, i) => `[${question.blanks[parseInt(i)]?.answer ?? '?'}]`
            )}
          </div>

          {/* Per-blank comparison */}
          {!record.skipped && (
            <div className="flex flex-col gap-1.5">
              {question.blanks.map((blank, i) => {
                const userAns = record.user_answers[i] ?? '(no answer)';
                const correct = blank.answer;
                const match   = userAns.toLowerCase() === correct.toLowerCase();
                return (
                  <div key={blank.id} className="text-xs flex items-center gap-2 flex-wrap">
                    <span className="text-[#4a4a6a] w-16 flex-shrink-0">Blank {i + 1}:</span>
                    <span className={match ? 'text-[#22c55e]' : 'text-[#ef4444] line-through'}>
                      {userAns}
                    </span>
                    {!match && (
                      <>
                        <span className="text-[#4a4a6a]">→</span>
                        <span className="text-[#22c55e]">{correct}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-[#8b8ba8] leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

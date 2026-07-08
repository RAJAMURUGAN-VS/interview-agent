import type { McqQuestion, McqAnswer } from '../../types';

interface Props {
  question: McqQuestion;
  answer:   McqAnswer;
  index:    number;
}

export default function ReviewCard({ question, answer, index }: Props) {
  const correctOption  = question.options.find((o) => o.label === question.correct_label);
  const selectedOption = question.options.find((o) => o.label === answer.selected_label);

  return (
    <div className="card flex flex-col gap-3 animate-fade-in">

      {/* Question header */}
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 text-xs font-semibold text-[#4f46e5]
          bg-[#4f46e5]/10 border border-[#4f46e5]/20
          px-2 py-0.5 rounded-md mt-0.5">
          Q{index + 1}
        </span>
        <p className="text-sm font-medium text-[#f0f0ff] leading-snug">
          {question.question}
        </p>
      </div>

      {/* User's answer */}
      {answer.status === 'timeout' ? (
        <div className="flex items-center gap-2 text-sm px-3 py-2
          rounded-lg border bg-[#8b8ba8]/8 border-[#8b8ba8]/20 text-[#8b8ba8]">
          <i className="fas fa-clock" />
          <span className="font-medium">Time expired — no answer submitted</span>
        </div>
      ) : (
        <div className={`flex items-center gap-2 text-sm px-3 py-2
          rounded-lg border
          ${answer.is_correct
            ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'}`}>
          <i className={`fas ${answer.is_correct ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
          <span className="font-medium">Your answer:</span>
          <span>
            {question.type === 'fillup'
              ? answer.fill_input || '(no answer)'
              : selectedOption?.text ?? answer.selected_label}
          </span>
        </div>
      )}

      {/* Correct answer — only when wrong and not timeout */}
      {!answer.is_correct && answer.status !== 'timeout' && (
        <div className="flex items-center gap-2 text-sm px-3 py-2
          rounded-lg border bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]">
          <i className="fas fa-circle-check" />
          <span className="font-medium">Correct answer:</span>
          <span>
            {question.type === 'fillup'
              ? question.correct_label
              : correctOption?.text ?? question.correct_label}
          </span>
        </div>
      )}

      {/* Explanation */}
      <p className="text-xs text-[#8b8ba8] leading-relaxed pl-1">
        {question.explanation}
      </p>
    </div>
  );
}

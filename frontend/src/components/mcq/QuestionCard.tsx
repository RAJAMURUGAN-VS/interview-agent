import type { McqQuestion } from '../../types';
import OptionButton from './OptionButton';
import FillUpInput from './FillUpInput';

interface Props {
  question:        McqQuestion;
  questionNumber:  number;
  totalQuestions:  number;
  selectedLabel:   string | null;
  isAnswered:      boolean;
  onSelect:        (label: string) => void;
  onNext:          () => void;
  isLast:          boolean;
  fillInput:       string;
  onFillChange:    (v: string) => void;
}

export default function QuestionCard({
  question, questionNumber, totalQuestions,
  selectedLabel, isAnswered, onSelect, onNext, isLast,
  fillInput, onFillChange,
}: Props) {
  const getOptionStatus = (label: string) => {
    if (!isAnswered) return 'idle' as const;
    if (label === question.correct_label) {
      return (label === selectedLabel ? 'selected-correct' : 'reveal-correct') as const;
    }
    if (label === selectedLabel) return 'selected-wrong' as const;
    return 'idle' as const;
  };

  const isCorrect = question.type === 'fillup'
    ? fillInput.trim().toLowerCase() === question.correct_label.trim().toLowerCase()
    : selectedLabel === question.correct_label;

  return (
    <div className="card animate-fade-in flex flex-col gap-5">

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#1c1c27] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[#8b8ba8] font-medium flex-shrink-0">
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <p className="text-[#f0f0ff] font-semibold text-base leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {question.type !== 'fillup' && (
          <div className="flex flex-col gap-2.5">
            {question.options.map((opt) => (
              <OptionButton
                key={opt.label}
                label={opt.label}
                text={opt.text}
                status={getOptionStatus(opt.label)}
                disabled={isAnswered}
                onClick={() => onSelect(opt.label)}
              />
            ))}
          </div>
        )}

        {question.type === 'fillup' && (
          <FillUpInput
            value={fillInput}
            onChange={onFillChange}
            disabled={isAnswered}
            isCorrect={
              isAnswered
                ? fillInput.trim().toLowerCase() ===
                  question.correct_label.trim().toLowerCase()
                : null
            }
            onSubmit={onNext}
          />
        )}
      </div>

      {/* Explanation — shown after answering */}
      {isAnswered && (
        <div className={`animate-fade-in rounded-xl px-4 py-3 text-sm
          leading-relaxed border
          ${isCorrect
            ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'}`}>
          <i className={`${isCorrect ? 'fas fa-circle-check' : 'fas fa-circle-xmark'} mr-2`} />
          <span className="font-semibold mr-1">
            {isCorrect ? 'Correct!' : 'Incorrect.'}
          </span>
          <span className="text-[#8b8ba8]">{question.explanation}</span>
        </div>
      )}

      {/* Fill-up correct answer reveal */}
      {isAnswered && question.type === 'fillup' && (
        (() => {
          const correct = fillInput.trim().toLowerCase() ===
            question.correct_label.trim().toLowerCase();
          return !correct ? (
            <div className="text-xs text-[#8b8ba8]">
              Correct answer:{' '}
              <span className="font-semibold text-[#22c55e]">
                {question.correct_label}
              </span>
            </div>
          ) : null;
        })()
      )}

      {/* Next / Finish button */}
      {isAnswered && (
        <div className="flex justify-end animate-fade-in">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm
              font-semibold transition-all duration-200
              hover:shadow-[0_0_12px_rgba(79,70,229,0.3)]"
          >
            {isLast ? 'See Results' : 'Next'}
            <i className={`fas ${isLast ? 'fa-chart-bar' : 'fa-arrow-right'} text-xs`} />
          </button>
        </div>
      )}
    </div>
  );
}

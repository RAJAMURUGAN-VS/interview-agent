import type { CfQuestion, CfBlankResult } from '../../types';
import CodeSnippet from './CodeSnippet';
import AttemptDots from './AttemptDots';

const MAX_ATTEMPTS = 3;

interface Props {
  question:       CfQuestion;
  questionNumber: number;
  totalQuestions: number;
  userInputs:     string[];
  attempts:       number;
  hintUnlocked:   boolean;
  hintVisible:    boolean;
  isAnswered:     boolean;
  isWrongShake:   boolean;
  blankResults:   CfBlankResult[] | null;
  isChecking:     boolean;
  isLast:         boolean;
  onInputChange:  (index: number, value: string) => void;
  onSubmit:       () => void;
  onShowHint:     () => void;
  onSkip:         () => void;
  onNext:         () => void;
}

export default function CodeFillQuiz({
  question, questionNumber, totalQuestions,
  userInputs, attempts, hintUnlocked, hintVisible,
  isAnswered, isWrongShake, blankResults, isChecking, isLast,
  onInputChange, onSubmit, onShowHint, onSkip, onNext,
}: Props) {
  const allInputsFilled = userInputs.every((v) => v.trim() !== '');

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

      {/* Language + topic badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-md
          bg-[#4f46e5]/10 border border-[#4f46e5]/20 text-[#4f46e5] font-medium">
          {question.language}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-md
          bg-[#1c1c27] border border-[#2a2a3d] text-[#8b8ba8]">
          {question.topic}
        </span>
      </div>

      {/* Prompt */}
      <p className="text-[#f0f0ff] font-semibold text-base leading-relaxed">
        {question.prompt}
      </p>

      {/* Code snippet */}
      <CodeSnippet
        codeTemplate={question.code_template}
        userInputs={userInputs}
        blankResults={blankResults}
        isAnswered={isAnswered}
        isWrongShake={isWrongShake}
        disabled={isChecking}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
      />

      {/* Attempt dots + hint button */}
      {!isAnswered && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <AttemptDots attempts={attempts} maxAttempts={MAX_ATTEMPTS} />
          <button
            onClick={onShowHint}
            disabled={!hintUnlocked || hintVisible}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium border transition-all duration-200
              ${hintUnlocked && !hintVisible
                ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10 animate-pulse'
                : 'border-[#2a2a3d] text-[#4a4a6a] cursor-not-allowed opacity-50'}`}
          >
            <i className="fas fa-lightbulb" />
            {hintVisible ? 'Hint shown' : hintUnlocked ? 'Show Hint' : `Hint (after ${MAX_ATTEMPTS} attempts)`}
          </button>
        </div>
      )}

      {/* Hint panel */}
      {hintVisible && !isAnswered && (
        <div className="animate-fade-in rounded-xl px-4 py-3 text-sm
          bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] leading-relaxed">
          <i className="fas fa-lightbulb mr-2" />
          <span className="font-semibold mr-1">Hint:</span>
          {question.blanks.map((b) => b.hint).join(' | ')}
        </div>
      )}

      {/* Wrong feedback */}
      {attempts > 0 && !isAnswered && blankResults && !blankResults.every((r) => r.is_correct) && (
        <div className="animate-fade-in rounded-xl px-4 py-3 text-sm
          bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]">
          <i className="fas fa-circle-xmark mr-2" />
          Incorrect — check your answers and try again.
        </div>
      )}

      {/* Correct feedback */}
      {isAnswered && (
        <div className="animate-fade-in rounded-xl px-4 py-3 text-sm
          bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] leading-relaxed">
          <i className="fas fa-circle-check mr-2" />
          <span className="font-semibold mr-1">Correct!</span>
          <span className="text-[#8b8ba8]">{question.explanation}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {!isAnswered
          ? <button onClick={onSkip}
              className="text-xs text-[#4a4a6a] hover:text-[#8b8ba8] transition-colors duration-200">
              Skip this question →
            </button>
          : <div />}

        {!isAnswered ? (
          <button
            onClick={onSubmit}
            disabled={!allInputsFilled || isChecking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm
              font-semibold transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:shadow-[0_0_12px_rgba(79,70,229,0.3)]"
          >
            {isChecking
              ? <><i className="fas fa-spinner fa-spin" />Checking…</>
              : <><i className="fas fa-check" />Submit</>}
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
}

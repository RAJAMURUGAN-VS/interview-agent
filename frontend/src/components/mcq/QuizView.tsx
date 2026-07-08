import type { McqQuestion, McqTimerConfig } from '../../types';
import QuestionCard from './QuestionCard';
import TimerBar from './TimerBar';

interface Props {
  questions:       McqQuestion[];
  currentQuestion: McqQuestion;
  currentIndex:    number;
  selectedLabel:   string | null;
  isAnswered:      boolean;
  isLast:          boolean;
  onSelect:        (label: string) => void;
  onNext:          () => void;
  timerConfig:     McqTimerConfig;
  timeRemaining:   number;
  fillInput:       string;
  onFillChange:    (v: string) => void;
}

export default function QuizView({
  questions, currentQuestion, currentIndex,
  selectedLabel, isAnswered, isLast, onSelect, onNext,
  timerConfig, timeRemaining, fillInput, onFillChange,
}: Props) {
  return (
    <div className="animate-fade-in max-w-2xl mx-auto flex flex-col gap-3">
      {timerConfig.mode !== 'none' && (
        <TimerBar
          mode={timerConfig.mode}
          timeRemaining={timeRemaining}
          totalSecs={
            timerConfig.mode === 'per-question'
              ? timerConfig.perQuestionSecs
              : timerConfig.fullQuizMins * 60
          }
        />
      )}
      <QuestionCard
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        selectedLabel={selectedLabel}
        isAnswered={isAnswered}
        onSelect={onSelect}
        onNext={onNext}
        isLast={isLast}
        fillInput={fillInput}
        onFillChange={onFillChange}
      />
    </div>
  );
}

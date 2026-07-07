import type { McqQuestion } from '../../types';
import QuestionCard from './QuestionCard';

interface Props {
  questions:       McqQuestion[];
  currentQuestion: McqQuestion;
  currentIndex:    number;
  selectedLabel:   string | null;
  isAnswered:      boolean;
  isLast:          boolean;
  onSelect:        (label: string) => void;
  onNext:          () => void;
}

export default function QuizView({
  questions, currentQuestion, currentIndex,
  selectedLabel, isAnswered, isLast, onSelect, onNext,
}: Props) {
  return (
    <div className="animate-fade-in">
      <QuestionCard
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        selectedLabel={selectedLabel}
        isAnswered={isAnswered}
        onSelect={onSelect}
        onNext={onNext}
        isLast={isLast}
      />
    </div>
  );
}

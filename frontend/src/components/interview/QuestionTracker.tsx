interface QuestionTrackerProps {
  questionNumber: number;
}

export default function QuestionTracker({ questionNumber }: QuestionTrackerProps) {
  return (
    <span className="text-gray-300 text-base font-medium">
      Question <span className="text-white font-bold text-lg">{questionNumber}</span>/5
    </span>
  );
}

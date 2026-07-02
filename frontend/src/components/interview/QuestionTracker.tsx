interface Props { questionNumber: number; }

export default function QuestionTracker({ questionNumber }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}
            className={`h-1.5 rounded-full transition-all duration-300
              ${i < questionNumber
                ? 'w-5 bg-[#4f46e5]'
                : 'w-1.5 bg-[#2a2a3d]'}`}
          />
        ))}
      </div>
      <span className="text-xs text-[#8b8ba8] font-medium">
        {questionNumber} / 5
      </span>
    </div>
  );
}

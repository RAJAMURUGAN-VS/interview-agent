interface Props {
  attempts:    number;
  maxAttempts: number;
}

export default function AttemptDots({ attempts, maxAttempts }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#8b8ba8] mr-1">Attempts:</span>
      {Array.from({ length: maxAttempts }, (_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300
            ${i < attempts ? 'bg-[#ef4444]' : 'bg-[#2a2a3d]'}`}
        />
      ))}
      <span className="text-xs text-[#4a4a6a] ml-1">
        {attempts}/{maxAttempts}
      </span>
    </div>
  );
}

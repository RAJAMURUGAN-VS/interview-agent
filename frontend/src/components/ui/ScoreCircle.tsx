interface ScoreCircleProps { score: number; }

export default function ScoreCircle({ score }: ScoreCircleProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 5) * circumference;
  const color = score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius}
          fill="none" stroke="#2a2a3d" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-[#f0f0ff]">{score}</span>
        <span className="text-xs text-[#8b8ba8] font-medium">/ 5</span>
      </div>
    </div>
  );
}

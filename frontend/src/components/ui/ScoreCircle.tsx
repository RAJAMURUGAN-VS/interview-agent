interface ScoreCircleProps {
  score: number;
}

export default function ScoreCircle({ score }: ScoreCircleProps) {
  const offset = 301.6 - (score / 5) * 301.6;

  return (
    <div className="text-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="#27272a" strokeWidth="5" fill="none" />
          <circle
            cx="48" cy="48" r="40"
            stroke="url(#scoreGradient)"
            strokeWidth="5" fill="none"
            strokeDasharray="251.2"
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-400">/5</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">Score</p>
    </div>
  );
}

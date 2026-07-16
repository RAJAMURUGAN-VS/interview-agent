import type { PrepDay } from '../../types';

interface DayCardProps {
  day:      PrepDay;
  isActive: boolean;
  score?:   number | null;   // percentage 0-100, null = not yet attempted
  onClick:  () => void;
}

function ScoreBadge({ pct }: { pct: number }) {
  const { label, cls } = pct >= 70
    ? { label: `${pct}%`, cls: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' }
    : { label: `${pct}%`, cls: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30' };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold
      border flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

export default function DayCard({ day, isActive, score = null, onClick }: DayCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl
        border transition-all duration-200 group
        ${isActive
          ? 'bg-[#4f46e5] border-[#4f46e5] shadow-[0_0_12px_rgba(79,70,229,0.3)]'
          : 'bg-[#13131a] border-[#2a2a3d] hover:border-[#4f46e5]/40'
        }`}
    >
      {/* Day number / icon bubble */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
        flex-shrink-0 text-xs font-bold transition-colors
        ${isActive
          ? 'bg-white/20 text-white'
          : day.isReview
            ? 'bg-[#4f46e5]/15 text-[#4f46e5]'
            : score !== null
              ? score >= 70
                ? 'bg-[#22c55e]/15 text-[#22c55e]'
                : 'bg-[#ef4444]/15 text-[#ef4444]'
              : 'bg-[#1c1c27] text-[#8b8ba8] group-hover:text-[#f0f0ff]'
        }`}
      >
        {day.isReview
          ? <i className="fas fa-rotate text-[10px]" />
          : score !== null
            ? <i className={`fas ${score >= 70 ? 'fa-check' : 'fa-rotate'} text-[10px]`} />
            : day.dayNumber
        }
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate transition-colors
          ${isActive ? 'text-white' : 'text-[#c0c0d8] group-hover:text-[#f0f0ff]'}`}>
          {day.isReview ? 'Review Day' : day.topic}
        </p>
        <p className={`text-[10px] mt-0.5 transition-colors
          ${isActive ? 'text-white/60' : 'text-[#4a4a6a]'}`}>
          Day {day.dayNumber}
          {score !== null && !day.isReview && (score < 70 ? ' · needs revisit' : ' · done')}
        </p>
      </div>

      {/* Right badge */}
      {!isActive && (
        day.isReview
          ? <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0
              font-semibold bg-[#4f46e5]/10 text-[#818cf8] border border-[#4f46e5]/20">
              REV
            </span>
          : score !== null
            ? <ScoreBadge pct={score} />
            : null
      )}
    </button>
  );
}

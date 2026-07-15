import type { PrepDay } from '../../types';

interface DayCardProps {
  day:       PrepDay;
  isActive:  boolean;
  onClick:   () => void;
}

export default function DayCard({ day, isActive, onClick }: DayCardProps) {
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
      {/* Day number bubble */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
        flex-shrink-0 text-xs font-bold transition-colors
        ${isActive
          ? 'bg-white/20 text-white'
          : day.isReview
            ? 'bg-[#4f46e5]/15 text-[#4f46e5]'
            : 'bg-[#1c1c27] text-[#8b8ba8] group-hover:text-[#f0f0ff]'
        }`}>
        {day.isReview
          ? <i className="fas fa-rotate text-[10px]" />
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
        </p>
      </div>

      {/* Review badge */}
      {day.isReview && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-semibold
          ${isActive ? 'bg-white/20 text-white' : 'bg-[#4f46e5]/10 text-[#818cf8]'}`}>
          REV
        </span>
      )}
    </button>
  );
}

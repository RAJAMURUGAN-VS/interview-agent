import type { McqTimerMode } from '../../types';

interface Props {
  mode:          McqTimerMode;
  timeRemaining: number;        // seconds
  totalSecs:     number;        // total seconds for this timer period
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0
    ? `${m}:${s.toString().padStart(2, '0')}`
    : `${s}s`;
}

export default function TimerBar({ mode, timeRemaining, totalSecs }: Props) {
  if (mode === 'none') return null;

  const pct     = totalSecs > 0 ? (timeRemaining / totalSecs) * 100 : 0;
  const isUrgent = pct <= 25;

  const barColor = pct > 50
    ? 'bg-[#22c55e]'
    : pct > 25
    ? 'bg-[#f59e0b]'
    : 'bg-[#ef4444]';

  const textColor = isUrgent ? 'text-[#ef4444]' : 'text-[#8b8ba8]';

  return (
    <div className="flex items-center gap-3">
      {/* Clock icon */}
      <i className={`fas fa-clock text-xs ${textColor}
        ${isUrgent ? 'animate-pulse' : ''}`} />

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-[#1c1c27] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000
            ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Time display */}
      <span className={`text-xs font-mono font-semibold flex-shrink-0
        ${textColor} ${isUrgent ? 'animate-pulse' : ''}`}>
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}

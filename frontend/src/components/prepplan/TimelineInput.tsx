const DAY_PRESETS = [5, 7, 10, 14, 21, 30];

interface TimelineInputProps {
  days:     number;
  onChange: (days: number) => void;
  disabled: boolean;
}

export default function TimelineInput({ days, onChange, disabled }: TimelineInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8b8ba8] uppercase
        tracking-wider mb-1.5">
        Days Available *
      </label>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {DAY_PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium
              transition-all duration-200
              ${days === d
                ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                : 'bg-[#0a0a0f] border-[#2a2a3d] text-[#8b8ba8] hover:text-[#f0f0ff] hover:border-[#4f46e5]/40'
              } disabled:opacity-50`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Manual input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1 && v <= 90) onChange(v);
          }}
          disabled={disabled}
          className="w-24 bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl
            px-3 py-2 text-sm text-[#f0f0ff] text-center
            focus:outline-none focus:border-[#4f46e5] focus:ring-1
            focus:ring-[#4f46e5]/40 transition-colors disabled:opacity-50"
        />
        <span className="text-xs text-[#8b8ba8]">custom days (max 90)</span>
      </div>
    </div>
  );
}

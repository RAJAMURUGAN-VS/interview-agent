interface StatItem {
  icon: string;
  label: string;
  value: string | number;
  accent?: boolean;
}

interface StatsBarProps {
  stats: StatItem[];
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 bg-[#1a1a2e] border border-[#2a2a3d]
            rounded-xl px-3 py-2"
        >
          <i className={`${s.icon} text-xs ${s.accent ? 'text-[#4f46e5]' : 'text-[#8b8ba8]'}`} />
          <span className="text-xs text-[#8b8ba8]">{s.label}</span>
          <span className={`text-xs font-semibold ${s.accent ? 'text-[#4f46e5]' : 'text-[#f0f0ff]'}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

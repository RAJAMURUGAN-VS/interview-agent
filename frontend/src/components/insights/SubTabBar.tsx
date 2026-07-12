import type { InsightsSubTab } from '../../types';

interface SubTabBarProps {
  active: InsightsSubTab;
  expCount: number;
  prepCount: number;
  onChange: (tab: InsightsSubTab) => void;
}

const TABS: { value: InsightsSubTab; label: string; icon: string }[] = [
  { value: 'experience',   label: 'Interview Experiences', icon: 'fas fa-comment-dots' },
  { value: 'preparation',  label: 'How They Prepared',     icon: 'fas fa-book-open'    },
];

export default function SubTabBar({ active, expCount, prepCount, onChange }: SubTabBarProps) {
  const counts: Record<InsightsSubTab, number> = {
    experience:  expCount,
    preparation: prepCount,
  };

  return (
    <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d] w-fit">
      {TABS.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg
            text-sm font-medium transition-all duration-200
            ${active === value
              ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
              : 'text-[#8b8ba8] hover:text-[#f0f0ff]'
            }`}
        >
          <i className={`${icon} text-xs`} />
          {label}
          <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
            ${active === value
              ? 'bg-white/20 text-white'
              : 'bg-[#2a2a3d] text-[#8b8ba8]'
            }`}>
            {counts[value]}
          </span>
        </button>
      ))}
    </div>
  );
}

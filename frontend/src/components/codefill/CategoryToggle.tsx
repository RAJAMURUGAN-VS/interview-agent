import type { CfCategory } from '../../types';

interface Props {
  selected: CfCategory;
  onChange: (cat: CfCategory) => void;
}

export default function CategoryToggle({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
        Category
      </p>
      <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d]">
        {([
          { value: 'competitive programming' as CfCategory, label: 'Competitive Programming', icon: 'fas fa-trophy' },
          { value: 'oop' as CfCategory,                     label: 'OOP',                     icon: 'fas fa-cube'   },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2
              px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium
              transition-all duration-200
              ${selected === opt.value
                ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
          >
            <i className={`${opt.icon} text-xs`} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

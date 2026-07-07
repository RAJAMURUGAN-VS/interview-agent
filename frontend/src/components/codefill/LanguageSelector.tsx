import type { CfLanguage } from '../../types';

const LANGUAGES: { value: CfLanguage; label: string; icon: string }[] = [
  { value: 'python', label: 'Python', icon: 'fab fa-python' },
  { value: 'java',   label: 'Java',   icon: 'fab fa-java'   },
  { value: 'c++',    label: 'C++',    icon: 'fas fa-code'   },
  { value: 'c',      label: 'C',      icon: 'fas fa-c'      },
];

interface Props {
  selected: CfLanguage;
  onChange: (lang: CfLanguage) => void;
}

export default function LanguageSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
        Programming Language
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => onChange(lang.value)}
            className={`flex flex-col items-center gap-2 py-4 rounded-xl
              border text-sm font-semibold transition-all duration-200
              touch-manipulation
              ${selected === lang.value
                ? 'bg-[#4f46e5]/10 border-[#4f46e5] text-[#4f46e5]'
                : 'bg-[#1c1c27] border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
          >
            <i className={`${lang.icon} text-2xl`} />
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}

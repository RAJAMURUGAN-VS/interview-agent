interface CompanySearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export default function CompanySearchBar({ value, onChange }: CompanySearchBarProps) {
  return (
    <div className="relative">
      <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2
        text-[#8b8ba8] text-sm pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search companies…"
        className="w-full bg-[#13131a] border border-[#2a2a3d] rounded-xl
          pl-9 pr-4 py-2.5 text-sm text-[#f0f0ff] placeholder-[#8b8ba8]
          focus:outline-none focus:border-[#4f46e5] focus:ring-1
          focus:ring-[#4f46e5]/40 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2
            text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors"
          aria-label="Clear search"
        >
          <i className="fas fa-xmark text-sm" />
        </button>
      )}
    </div>
  );
}

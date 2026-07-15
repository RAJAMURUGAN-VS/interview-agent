interface CompanyInputProps {
  value:               string;
  onChange:            (v: string) => void;
  suggestions:         string[];
  showSuggestions:     boolean;
  onShowSuggestions:   (show: boolean) => void;
  onSelect:            (name: string) => void;
  disabled:            boolean;
}

export default function CompanyInput({
  value, onChange, suggestions, showSuggestions,
  onShowSuggestions, onSelect, disabled,
}: CompanyInputProps) {
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-[#8b8ba8] uppercase
        tracking-wider mb-1.5">
        Company *
      </label>

      <div className="relative">
        <i className="fas fa-building absolute left-3.5 top-1/2 -translate-y-1/2
          text-[#8b8ba8] text-sm pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); onShowSuggestions(true); }}
          onFocus={() => onShowSuggestions(true)}
          onBlur={() => setTimeout(() => onShowSuggestions(false), 150)}
          placeholder="Which company are you preparing for?"
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl
            pl-9 pr-4 py-3 text-sm text-[#f0f0ff] placeholder-[#4a4a6a]
            focus:outline-none focus:border-[#4f46e5] focus:ring-1
            focus:ring-[#4f46e5]/40 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && hasSuggestions && value.trim() === '' && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1
          bg-[#13131a] border border-[#2a2a3d] rounded-xl
          shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-[#4a4a6a]
            px-3 py-2 border-b border-[#2a2a3d]">
            Previously searched
          </p>
          {suggestions.map((s) => (
            <button
              key={s}
              onMouseDown={() => { onSelect(s); onShowSuggestions(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-[#c0c0d8]
                hover:bg-[#4f46e5]/10 hover:text-[#f0f0ff] transition-colors
                flex items-center gap-2"
            >
              <i className="fas fa-clock-rotate-left text-xs text-[#4a4a6a]" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filtered suggestions while typing */}
      {showSuggestions && value.trim().length > 0 && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1
          bg-[#13131a] border border-[#2a2a3d] rounded-xl
          shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions
            .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
            .map((s) => (
              <button
                key={s}
                onMouseDown={() => { onSelect(s); onShowSuggestions(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-[#c0c0d8]
                  hover:bg-[#4f46e5]/10 hover:text-[#f0f0ff] transition-colors
                  flex items-center gap-2"
              >
                <i className="fas fa-magnifying-glass text-xs text-[#4a4a6a]" />
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

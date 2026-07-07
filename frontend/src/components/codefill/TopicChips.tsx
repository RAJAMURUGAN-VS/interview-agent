interface Props {
  presetTopics:   string[];
  selectedTopics: string[];
  customInput:    string;
  onToggle:       (topic: string) => void;
  onCustomChange: (v: string) => void;
  onCustomAdd:    () => void;
  onCustomRemove: (topic: string) => void;
}

export default function TopicChips({
  presetTopics, selectedTopics, customInput,
  onToggle, onCustomChange, onCustomAdd, onCustomRemove,
}: Props) {
  const customTopics = selectedTopics.filter((t) => !presetTopics.includes(t));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); onCustomAdd(); }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
        Topics
        <span className="ml-2 text-[#4a4a6a] normal-case tracking-normal">
          ({selectedTopics.length} selected)
        </span>
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {presetTopics.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => onToggle(topic)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium
                capitalize transition-all duration-200 touch-manipulation
                ${isSelected
                  ? 'bg-[#4f46e5]/10 border-[#4f46e5] text-[#4f46e5]'
                  : 'bg-transparent border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
            >
              {isSelected && <i className="fas fa-check mr-1.5 text-[10px]" />}
              {topic}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => onCustomChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add custom topic…"
          className="flex-1 bg-[#1c1c27] border border-[#2a2a3d]
            focus:border-[#4f46e5] rounded-xl px-4 py-2 text-sm
            text-[#f0f0ff] placeholder-[#4a4a6a] outline-none
            transition-colors duration-200"
        />
        <button
          onClick={onCustomAdd}
          disabled={!customInput.trim()}
          className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
            text-white text-sm font-semibold transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="fas fa-plus mr-1" />Add
        </button>
      </div>

      {customTopics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {customTopics.map((topic) => (
            <span key={topic}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-[#22c55e]/10 border border-[#22c55e]/30
                text-[#22c55e] text-xs font-medium">
              {topic}
              <button
                onClick={() => onCustomRemove(topic)}
                className="hover:text-white transition-colors duration-150"
                aria-label={`Remove ${topic}`}
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

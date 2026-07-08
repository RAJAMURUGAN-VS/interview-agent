interface Props {
  value:      string;
  onChange:   (v: string) => void;
  disabled:   boolean;
  isCorrect:  boolean | null;   // null = not yet submitted
  onSubmit:   () => void;
}

export default function FillUpInput({
  value, onChange, disabled, isCorrect, onSubmit }: Props) {

  const borderColor = isCorrect === null
    ? 'border-[#2a2a3d] focus-within:border-[#4f46e5]'
    : isCorrect
    ? 'border-[#22c55e] bg-[#22c55e]/5'
    : 'border-[#ef4444] bg-[#ef4444]/5';

  const textColor = isCorrect === null
    ? 'text-[#f0f0ff]'
    : isCorrect
    ? 'text-[#22c55e]'
    : 'text-[#ef4444]';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-widest text-[#8b8ba8]
        font-medium">
        Your Answer
      </label>
      <div className={`flex items-center gap-3 border rounded-xl
        px-4 py-3 transition-all duration-200 ${borderColor}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) onSubmit();
          }}
          disabled={disabled}
          placeholder="Type your answer here…"
          spellCheck={false}
          autoComplete="off"
          className={`flex-1 bg-transparent outline-none text-sm
            placeholder-[#4a4a6a] disabled:cursor-default ${textColor}`}
        />
        {isCorrect === true  && <i className="fas fa-circle-check text-[#22c55e]" />}
        {isCorrect === false && <i className="fas fa-circle-xmark text-[#ef4444]" />}
      </div>
    </div>
  );
}

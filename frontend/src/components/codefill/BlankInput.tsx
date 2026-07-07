interface Props {
  index:    number;
  value:    string;
  status:   'idle' | 'correct' | 'wrong';
  disabled: boolean;
  onChange: (index: number, value: string) => void;
  onEnter?: () => void;
}

export default function BlankInput({ index, value, status, disabled, onChange, onEnter }: Props) {
  const statusStyles = {
    idle:    'border-[#4f46e5] bg-[#1c1c27] text-[#f0f0ff] focus:border-[#818cf8]',
    correct: 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]',
    wrong:   'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]',
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(index, e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      spellCheck={false}
      autoComplete="off"
      aria-label={`Blank ${index + 1}`}
      className={`inline-block border rounded-lg px-2 py-0.5
        text-sm font-mono outline-none transition-all duration-200
        disabled:cursor-default min-w-[80px]
        ${statusStyles[status]}`}
      style={{ width: `${Math.max(80, value.length * 9 + 24)}px` }}
    />
  );
}

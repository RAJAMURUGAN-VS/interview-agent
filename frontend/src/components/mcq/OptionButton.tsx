interface Props {
  label: string;
  text: string;
  status: 'idle' | 'selected-correct' | 'selected-wrong' | 'reveal-correct';
  disabled: boolean;
  onClick: () => void;
}

export default function OptionButton({ label, text, status, disabled, onClick }: Props) {
  const styles: Record<string, string> = {
    'idle':             'bg-[#1c1c27] border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff] hover:bg-[#2a2a3d]',
    'selected-correct': 'bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e]',
    'selected-wrong':   'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]',
    'reveal-correct':   'bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e]',
  };

  const icon: Record<string, string | null> = {
    'idle':             null,
    'selected-correct': 'fas fa-circle-check',
    'selected-wrong':   'fas fa-circle-xmark',
    'reveal-correct':   'fas fa-circle-check',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5
        rounded-xl border text-sm text-left font-medium
        transition-all duration-200 disabled:cursor-default
        ${styles[status]}`}
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-lg border
        flex items-center justify-center text-xs font-bold
        border-current opacity-70">
        {label}
      </span>
      <span className="flex-1">{text}</span>
      {icon[status] && (
        <i className={`${icon[status]} flex-shrink-0 text-base`} />
      )}
    </button>
  );
}

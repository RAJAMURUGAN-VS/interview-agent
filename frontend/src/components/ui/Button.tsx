interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'ghost' | 'danger';
}

export default function Button({ label, onClick, disabled = false, variant }: ButtonProps) {
  const base = 'px-8 py-3 rounded-full font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles: Record<string, string> = {
    primary: 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:shadow-lg hover:shadow-purple-500/30',
    ghost:   'border-2 border-zinc-700 text-gray-300 rounded-xl px-6 py-2.5 hover:border-red-500/50 hover:text-red-400 font-medium text-sm',
    danger:  'bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] text-white hover:opacity-90 shadow-lg shadow-purple-500/30',
  };

  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

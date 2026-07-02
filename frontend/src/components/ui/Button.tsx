interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export default function Button({
  label, onClick, disabled = false,
  variant = 'primary', fullWidth = false
}: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 font-semibold
    rounded-[10px] px-5 py-2.5 text-sm transition-all duration-200
    disabled:opacity-40 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}`;

  const styles = {
    primary: `bg-[#4f46e5] hover:bg-[#4338ca] text-white
              hover:shadow-[0_0_20px_rgba(79,70,229,0.3)]`,
    ghost:   `bg-transparent border border-[#2a2a3d] text-[#8b8ba8]
              hover:border-[#4f46e5] hover:text-[#f0f0ff]
              hover:bg-[rgba(79,70,229,0.08)]`,
    danger:  `bg-[#ef4444] hover:bg-[#dc2626] text-white`,
  };

  return (
    <button
      className={`${base} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

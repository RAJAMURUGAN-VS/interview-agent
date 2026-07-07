interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

export default function TextUpload({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium">
        Paste Your Notes
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste your study notes here… (minimum 100 characters)"
        rows={10}
        className="w-full bg-[#1c1c27] border border-[#2a2a3d]
          focus:border-[#4f46e5] rounded-xl px-4 py-3 text-sm
          text-[#f0f0ff] placeholder-[#4a4a6a] resize-none outline-none
          transition-colors duration-200 disabled:opacity-40 leading-relaxed"
      />
      <p className="text-xs text-[#4a4a6a] text-right">
        {value.length} characters
      </p>
    </div>
  );
}

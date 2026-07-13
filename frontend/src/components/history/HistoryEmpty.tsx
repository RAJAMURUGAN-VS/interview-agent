interface Props {
  message: string;
}

export default function HistoryEmpty({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3
      text-center">
      <div className="w-14 h-14 rounded-xl bg-[#1c1c27] border
        border-[#2a2a3d] flex items-center justify-center">
        <i className="fas fa-clock-rotate-left text-[#4a4a6a] text-xl" />
      </div>
      <p className="text-sm font-semibold text-[#f0f0ff]">No history yet</p>
      <p className="text-xs text-[#8b8ba8] max-w-[200px] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

interface RecordButtonProps {
  isRecording: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function RecordButton({ isRecording, disabled, onClick }: RecordButtonProps) {
  const base = 'w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2';
  const active = 'bg-red-500 text-white border-red-500 recording-active';
  const inactive = 'bg-zinc-800/80 text-gray-300 border-zinc-700/50 hover:border-zinc-500';

  return (
    <button
      className={`${base} ${isRecording ? active : inactive}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isRecording ? (
        <i className="fas fa-stop text-2xl lg:text-3xl" />
      ) : (
        <i className="fas fa-microphone text-2xl lg:text-3xl" />
      )}
    </button>
  );
}

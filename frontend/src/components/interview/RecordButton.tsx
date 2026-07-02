interface Props {
  isRecording: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function RecordButton({ isRecording, disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Record answer'}
      className={`relative w-16 h-16 rounded-full flex items-center
        justify-center transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isRecording
          ? 'bg-[#ef4444] shadow-[0_0_24px_rgba(239,68,68,0.4)] scale-110'
          : 'bg-[#1c1c27] border-2 border-[#2a2a3d] hover:border-[#4f46e5] hover:bg-[#2a2a3d]'}`}
    >
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-[#ef4444]
          animate-ping opacity-30" />
      )}
      <i className={`text-lg ${isRecording
        ? 'fas fa-stop text-white'
        : 'fas fa-microphone text-[#8b8ba8]'}`} />
    </button>
  );
}

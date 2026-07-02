interface Props { visible: boolean; }

export default function SpeakingBubble({ visible }: Props) {
  if (!visible) return null;
  return (
    <div className="animate-fade-in flex items-center gap-3
      px-4 py-3 rounded-xl bg-[#1c1c27] border border-[#2a2a3d]">
      <div className="relative flex items-center justify-center w-8 h-8">
        <div className="pulse-ring w-8 h-8 rounded-full bg-[#4f46e5]
          flex items-center justify-center">
          <i className="fas fa-volume-up text-white text-xs" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#f0f0ff]">Natalie is speaking</p>
        <p className="text-xs text-[#8b8ba8]">Listen carefully…</p>
      </div>
    </div>
  );
}

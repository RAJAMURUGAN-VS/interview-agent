interface SpeakingBubbleProps {
  visible: boolean;
}

export default function SpeakingBubble({ visible }: SpeakingBubbleProps) {
  if (!visible) return null;

  return (
    <div className="max-w-2xl mx-auto mb-6">
      <div className="flex justify-center items-center gap-3 p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-[#667eea] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-[#764ba2] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-[#f093fb] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <span className="text-gray-200 ml-2 font-medium">Natalie is speaking...</span>
      </div>
    </div>
  );
}

interface ReviewDayBannerProps {
  dayNumber: number;
}

const REVIEW_TIPS = [
  'Re-solve 2 problems from each topic covered this week — without looking at solutions first.',
  'Write down 3 things you still find shaky. Focus your review session on those.',
  'Try explaining a concept you studied this week out loud, as if teaching someone.',
  'Pick one topic you rushed through and spend the full day going deeper on it.',
];

export default function ReviewDayBanner({ dayNumber }: ReviewDayBannerProps) {
  const tip = REVIEW_TIPS[(dayNumber - 1) % REVIEW_TIPS.length];

  return (
    <div className="card border-[#4f46e5]/20 bg-[#4f46e5]/5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/15 border border-[#4f46e5]/30
          flex items-center justify-center flex-shrink-0">
          <i className="fas fa-rotate text-[#4f46e5] text-sm" />
        </div>
        <div>
          <h3 className="text-[#f0f0ff] font-semibold text-sm mb-1">
            Review &amp; Consolidation Day
          </h3>
          <p className="text-xs text-[#8b8ba8] leading-relaxed">
            No new topics today — this is your consolidation day. Go back over the
            past few sessions, re-attempt problems you found hard, and fill any gaps.
          </p>
          <div className="mt-3 bg-[#0a0a0f] rounded-xl px-3 py-2.5
            border border-[#2a2a3d] text-xs text-[#c0c0d8] leading-relaxed">
            <i className="fas fa-lightbulb text-[#4f46e5] mr-2" />
            {tip}
          </div>
        </div>
      </div>
    </div>
  );
}

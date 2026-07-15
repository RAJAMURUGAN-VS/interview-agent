import type { PrepConfidence } from '../../types';

interface ConfidenceBannerProps {
  confidence:  PrepConfidence;
  company:     string;
  sourceCount: number;
}

export default function ConfidenceBanner({ confidence, company, sourceCount }: ConfidenceBannerProps) {
  if (confidence === 'high' || confidence === 'medium') return null;

  return (
    <div className="flex items-start gap-3 bg-[#1c1c27] border border-[#2a2a3d]
      rounded-xl px-4 py-3 text-sm text-[#8b8ba8]">
      <i className="fas fa-circle-info text-[#f59e0b] mt-0.5 flex-shrink-0" />
      <p>
        <span className="text-[#f0f0ff] font-medium">Limited public data found for {company}</span>
        {sourceCount > 0 && ` (${sourceCount} source${sourceCount !== 1 ? 's' : ''})`}.
        {' '}This plan uses general fresher-interview best practices as a fallback —
        it's still a solid starting point, and will improve as more seniors share
        their experiences in{' '}
        <span className="text-[#4f46e5] font-medium">Insights</span>.
      </p>
    </div>
  );
}

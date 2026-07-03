import ScoreCircle from '../ui/ScoreCircle';
import type { FeedbackData } from '../../types';

interface Props { feedbackData: FeedbackData; }

export default function FeedbackCard({ feedbackData }: Props) {
  const score = feedbackData.candidate_score;
  const performanceLabel =
    score >= 4 ? 'Strong performance'
    : score >= 3 ? 'Good attempt'
    : 'Needs improvement';

  const performanceColor =
    score >= 4 ? 'text-[#10b981]'
    : score >= 3 ? 'text-[#f59e0b]'
    : 'text-[#ef4444]';

  return (
    <div className="animate-fade-in space-y-4">

      {/* Score + subject banner */}
      <div className="card flex flex-col items-center gap-4 text-center">
        <ScoreCircle score={score} />
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-1">
            Overall Score
          </p>
          <p className="text-xl font-bold text-[#f0f0ff] mb-1">
            {feedbackData.subject}
          </p>
          <span className={`text-sm font-semibold ${performanceColor}`}>
            {performanceLabel}
          </span>
        </div>
      </div>

      {/* Feedback */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-star text-[#4f46e5] text-xs" />
          <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium">
            Feedback
          </p>
        </div>
        <p className="text-sm text-[#c8c8d8] leading-relaxed">
          {feedbackData.feedback}
        </p>
      </div>

      {/* Areas of improvement */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-arrow-trend-up text-[#f59e0b] text-xs" />
          <p className="text-xs uppercase tracking-widest text-[#f59e0b] font-medium">
            Areas to Improve
          </p>
        </div>
        <p className="text-sm text-[#c8c8d8] leading-relaxed">
          {feedbackData.areas_of_improvement}
        </p>
      </div>

    </div>
  );
}

import ScoreCircle from '../ui/ScoreCircle';
import type { FeedbackData } from '../../types';

interface Props { feedbackData: FeedbackData; }

export default function FeedbackCard({ feedbackData }: Props) {
  return (
    <div className="animate-fade-in space-y-6">

      {/* Score row */}
      <div className="card flex items-center gap-6">
        <ScoreCircle score={feedbackData.candidate_score} />
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8b8ba8]
            font-medium mb-1">
            Overall Score
          </p>
          <p className="text-[#f0f0ff] font-semibold">
            {feedbackData.subject}
          </p>
          <p className="text-xs text-[#8b8ba8] mt-1">
            {feedbackData.candidate_score >= 4
              ? 'Strong performance'
              : feedbackData.candidate_score >= 3
              ? 'Good attempt'
              : 'Needs improvement'}
          </p>
        </div>
      </div>

      {/* Feedback */}
      <div className="card">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5]
          font-medium mb-3">
          <i className="fas fa-star mr-2" />Feedback
        </p>
        <p className="text-sm text-[#8b8ba8] leading-relaxed">
          {feedbackData.feedback}
        </p>
      </div>

      {/* Areas of improvement */}
      <div className="card border-[#2a2a3d]">
        <p className="text-xs uppercase tracking-widest text-[#f59e0b]
          font-medium mb-3">
          <i className="fas fa-arrow-up mr-2" />Areas to Improve
        </p>
        <p className="text-sm text-[#8b8ba8] leading-relaxed">
          {feedbackData.areas_of_improvement}
        </p>
      </div>
    </div>
  );
}

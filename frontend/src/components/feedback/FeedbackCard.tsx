import ScoreCircle from '../ui/ScoreCircle';
import type { FeedbackData, Subject } from '../../types/interview';

interface FeedbackCardProps {
  feedbackData: FeedbackData;
  subject: Subject;
}

export default function FeedbackCard({ feedbackData, subject }: FeedbackCardProps) {
  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
        <div>
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Detailed Feedback</p>
          <h3 className="font-space text-2xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            {feedbackData.subject || subject}
          </h3>
        </div>
        <ScoreCircle score={feedbackData.candidate_score || 0} />
      </div>

      {/* Feedback cards */}
      <div className="space-y-4">
        <div className="bg-zinc-900/30 rounded-xl p-5 border border-zinc-800/50">
          <h4 className="text-lg font-bold mb-2 flex items-center gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            <i className="fas fa-star text-yellow-400" />
            Feedback
          </h4>
          <p className="text-gray-200 leading-relaxed text-sm">{feedbackData.feedback || 'No feedback available'}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-xl p-5 border border-zinc-800/50">
          <h4 className="text-lg font-bold mb-2 flex items-center gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            <i className="fas fa-chart-line text-cyan-400" />
            Areas of Improvement
          </h4>
          <p className="text-gray-200 leading-relaxed text-sm">{feedbackData.areas_of_improvement || 'No suggestions available'}</p>
        </div>
      </div>
    </div>
  );
}

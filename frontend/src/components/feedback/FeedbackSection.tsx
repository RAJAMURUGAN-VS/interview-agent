import type { FeedbackData } from '../../types';
import FeedbackCard from './FeedbackCard';
import Button from '../ui/Button';

interface Props {
  isFeedbackLoading: boolean;
  feedbackData: FeedbackData | null;
  onGetFeedback: () => void;
  onNewInterview: () => void;
}

export default function FeedbackSection({
  isFeedbackLoading, feedbackData, onGetFeedback, onNewInterview
}: Props) {
  return (
    <div className="animate-fade-in">

      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5]
          font-medium mb-2">
          Interview Complete
        </p>
        <h2 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">
          {feedbackData ? 'Your Results' : 'Ready for feedback?'}
        </h2>
      </div>

      {!feedbackData && (
        <div className="card text-center py-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full
            bg-[#1c1c27] border border-[#2a2a3d]
            flex items-center justify-center">
            <i className="fas fa-chart-bar text-[#4f46e5] text-2xl" />
          </div>
          <p className="text-sm text-[#8b8ba8] mb-6">
            Natalie will analyse your answers and give you a score with
            detailed feedback.
          </p>
          <Button
            label={isFeedbackLoading ? 'Generating…' : 'Get Feedback'}
            onClick={onGetFeedback}
            disabled={isFeedbackLoading}
          />
        </div>
      )}

      {feedbackData && (
        <>
          <FeedbackCard feedbackData={feedbackData} />
          <div className="mt-6 text-center">
            <Button
              label="Start New Interview"
              onClick={onNewInterview}
              variant="ghost"
            />
          </div>
        </>
      )}
    </div>
  );
}

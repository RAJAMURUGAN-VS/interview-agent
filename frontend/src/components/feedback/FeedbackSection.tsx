import type { FeedbackData, InterviewSaveType } from '../../types';
import FeedbackCard from './FeedbackCard';
import Button from '../ui/Button';

interface Props {
  isFeedbackLoading: boolean;
  feedbackData: FeedbackData | null;
  reportSaved: boolean;
  onGetFeedback: () => void;
  onNewInterview: () => void;
  onSaveReport: (type: InterviewSaveType) => void;
}

export default function FeedbackSection({
  isFeedbackLoading, feedbackData, reportSaved, onGetFeedback, onNewInterview, onSaveReport
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

          {/* Save prompt — shown once feedback is visible */}
          {!reportSaved && (
            <div className="card animate-fade-in mt-6">
              <p className="text-xs uppercase tracking-widest text-[#4f46e5]
                font-medium mb-3">
                <i className="fas fa-floppy-disk mr-1.5" />
                Save This Report?
              </p>
              <p className="text-xs text-[#8b8ba8] mb-4">
                Choose what to save to your local history for future reference.
              </p>
              <div className="flex flex-col gap-2">
                {([
                  { type: 'conversation' as InterviewSaveType,
                    label: 'Conversation Only',
                    icon: 'fas fa-comments',
                    desc: 'Save the full Q&A transcript' },
                  { type: 'feedback' as InterviewSaveType,
                    label: 'Feedback Only',
                    icon: 'fas fa-chart-bar',
                    desc: 'Save score, feedback, and pronunciation analysis' },
                  { type: 'both' as InterviewSaveType,
                    label: 'Save Both',
                    icon: 'fas fa-layer-group',
                    desc: 'Save conversation + full feedback report' },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => onSaveReport(opt.type)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl
                      border border-[#2a2a3d] hover:border-[#4f46e5]
                      hover:bg-[#4f46e5]/5 text-left transition-all duration-200
                      group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1c1c27] flex items-center
                      justify-center flex-shrink-0 group-hover:bg-[#4f46e5]/10
                      transition-colors duration-200">
                      <i className={`${opt.icon} text-[#4f46e5] text-xs`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#f0f0ff]">{opt.label}</p>
                      <p className="text-xs text-[#8b8ba8]">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved confirmation */}
          {reportSaved && (
            <div className="flex items-center gap-2 text-sm text-[#22c55e]
              justify-center animate-fade-in mt-6">
              <i className="fas fa-circle-check" />
              Report saved to your history
            </div>
          )}

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

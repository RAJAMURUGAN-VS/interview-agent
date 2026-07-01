import FeedbackCard from './FeedbackCard';
import type { FeedbackData, Subject } from '../../types/interview';

interface FeedbackSectionProps {
  isFeedbackLoading: boolean;
  feedbackData: FeedbackData | null;
  currentSubject: Subject | null;
  onGetFeedback: () => void;
  onNewInterview: () => void;
}

export default function FeedbackSection({
  isFeedbackLoading,
  feedbackData,
  currentSubject,
  onGetFeedback,
  onNewInterview,
}: FeedbackSectionProps) {
  return (
    <main className="flex-1 flex flex-col bg-black">
      <header className="px-4 lg:px-8 py-5 border-b border-zinc-800/50">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-space font-bold text-2xl lg:text-4xl tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
              Interview Feedback
            </span>
          </h1>
          <p className="text-gray-400 text-sm lg:text-base font-light">
            {currentSubject ? `${currentSubject} — Session Review` : 'Session Review'}
          </p>
        </div>
      </header>

      <div className="flex-1 p-4 lg:p-8 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-xl mt-6">
          {!feedbackData ? (
            <div className="text-center mb-6">
              <p className="text-gray-300 mb-4 text-base">Interview completed!</p>
              <button
                className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] text-white px-8 py-3 rounded-full font-bold text-base hover:opacity-90 transition-all duration-300 shadow-lg shadow-purple-500/30 disabled:opacity-50"
                onClick={onGetFeedback}
                disabled={isFeedbackLoading}
              >
                {isFeedbackLoading ? 'Generating...' : 'Get Feedback'}
              </button>
            </div>
          ) : (
            <>
              <FeedbackCard feedbackData={feedbackData} subject={currentSubject!} />
              <div className="text-center mt-8">
                <button
                  className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-10 py-3 rounded-xl font-bold text-base hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
                  onClick={onNewInterview}
                >
                  Start New Interview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

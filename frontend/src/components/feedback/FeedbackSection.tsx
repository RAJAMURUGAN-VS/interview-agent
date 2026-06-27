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
    <>
      {/* Sidebar stub */}
      <aside className="w-full lg:w-1/5 bg-gradient-to-b from-[#0a0a0a] to-black border-b lg:border-b-0 lg:border-r border-zinc-800/50 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fas fa-robot text-white text-xl" />
          </div>
          <span className="font-space font-bold text-2xl tracking-tight bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            AI Interview
          </span>
        </div>
        <div className="mt-auto pt-6 hidden lg:block">
          <p className="text-zinc-500 text-xs">Powered by AI</p>
        </div>
      </aside>

      <main className="flex-1 lg:w-4/5 flex flex-col bg-black">
        <header className="px-4 lg:px-8 py-6 lg:py-8 border-b border-zinc-800/50">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-space font-bold text-3xl lg:text-5xl xl:text-6xl tracking-tight mb-3">
              <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
                Master Your Interview
              </span>
            </h1>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="mt-10 pt-6 border-t border-zinc-800/50">
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
    </>
  );
}

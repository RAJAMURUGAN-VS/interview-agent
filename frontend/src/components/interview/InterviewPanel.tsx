import Badge from '../ui/Badge';
import QuestionTracker from './QuestionTracker';
import SpeakingBubble from './SpeakingBubble';
import RecordButton from './RecordButton';
import type { Subject, FeedbackData } from '../../types/interview';

interface InterviewPanelProps {
  currentSubject: Subject | null;
  questionNumber: number;
  isSpeaking: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordingStatus: string;
  feedbackData: FeedbackData | null;
  isFeedbackLoading: boolean;
  startInterview: () => void;
  toggleRecording: () => void;
  submitAnswer: () => void;
  endInterview: () => void;
}

export default function InterviewPanel({
  currentSubject,
  questionNumber,
  isSpeaking,
  isRecording,
  recordedBlob,
  recordingStatus,
  startInterview,
  toggleRecording,
  submitAnswer,
  endInterview,
}: InterviewPanelProps) {
  const showStartBtn =
    recordingStatus === 'Click Start Interview to begin' ||
    recordingStatus === 'Backend not connected';

  const showRecordBtn = !showStartBtn && recordingStatus !== 'Connecting...';

  return (
    <main className="flex-1 flex flex-col bg-black">
      {/* Header */}
      <header className="px-4 lg:px-8 py-5 border-b border-zinc-800/50">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-space font-bold text-2xl lg:text-4xl tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
              Master Your Interview
            </span>
          </h1>
          <p className="text-gray-400 text-sm lg:text-base font-light">
            Ace Your Technical Interviews with AI-Powered Practice and Feedback
          </p>
        </div>
      </header>

      <div className="flex-1 p-4 lg:p-6 overflow-y-auto flex flex-col">
        {/* Subject badge + question counter */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-5">
          {currentSubject && <Badge subject={currentSubject} />}
          <QuestionTracker questionNumber={questionNumber} />
        </div>

        {/* Natalie avatar */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-zinc-700/50 mb-3 shadow-2xl">
            <img
              src="https://www.whiteroomstudio.com.sg/wordpress/wp-content/uploads/2021/10/professional-headshot-photography-linkedin-singapore-5.jpeg"
              alt="Natalie"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-gray-300 text-base font-medium">Natalie</p>
        </div>

        {/* Speaking bubble */}
        <SpeakingBubble visible={isSpeaking} />

        {/* Recording controls */}
        <div className="flex flex-col items-center gap-4 mb-5 mt-2">
          {showStartBtn && (
            <button
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-8 py-3 rounded-full font-bold text-base hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              onClick={startInterview}
            >
              Start Interview
            </button>
          )}

          {showRecordBtn && (
            <RecordButton
              isRecording={isRecording}
              disabled={isSpeaking || recordingStatus === 'Submitting...'}
              onClick={toggleRecording}
            />
          )}

          <p role="status" aria-live="polite" className="text-gray-400 text-sm text-center">
            {recordingStatus}
          </p>

          {recordedBlob && !isRecording && recordingStatus === 'Recording complete' && (
            <button
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-8 py-3 rounded-full font-bold text-base hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              onClick={submitAnswer}
            >
              Submit Answer
            </button>
          )}
        </div>

        {/* End interview */}
        <div className="text-center mt-auto">
          <button
            disabled={showStartBtn || isSpeaking}
            className="border-2 border-zinc-700 text-gray-300 px-6 py-2.5 rounded-xl transition-all duration-300 hover:border-red-500/50 hover:text-red-400 font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={endInterview}
          >
            End Interview
          </button>
        </div>
      </div>
    </main>
  );
}

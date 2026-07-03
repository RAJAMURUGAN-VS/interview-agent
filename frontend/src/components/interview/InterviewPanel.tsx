import type { InterviewSubject, InterviewPhase, FeedbackData } from '../../types';
import SubjectSelector from './SubjectSelector';
import QuestionTracker from './QuestionTracker';
import SpeakingBubble from './SpeakingBubble';
import RecordButton from './RecordButton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import FeedbackSection from '../feedback/FeedbackSection';

interface Props {
  phase: InterviewPhase;
  currentSubject: InterviewSubject | null;
  questionNumber: number;
  recordingStatus: string;
  isSpeaking: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  feedbackData: FeedbackData | null;
  isFeedbackLoading: boolean;
  selectSubject: (s: InterviewSubject) => void;
  startInterview: () => void;
  toggleRecording: () => void;
  submitAnswer: () => void;
  endInterview: () => void;
  getFeedback: () => void;
  resetInterview: () => void;
}

export default function InterviewPanel(props: Props) {
  const {
    phase, currentSubject, questionNumber, recordingStatus,
    isSpeaking, isRecording, recordedBlob,
    feedbackData, isFeedbackLoading,
    selectSubject, startInterview, toggleRecording,
    submitAnswer, endInterview, getFeedback, resetInterview,
  } = props;

  // Welcome phase — no subject chosen yet
  if (phase === 'welcome' && !currentSubject) {
    return (
      <SubjectSelector
        onSelect={selectSubject}
        activeSubject={currentSubject}
      />
    );
  }

  // Feedback phase
  if (phase === 'feedback') {
    return (
      <FeedbackSection
        isFeedbackLoading={isFeedbackLoading}
        feedbackData={feedbackData}
        onGetFeedback={getFeedback}
        onNewInterview={resetInterview}
      />
    );
  }

  // Active interview phase + welcome with subject selected
  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-24 pb-12">

      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        {currentSubject && <Badge subject={currentSubject} />}
        <QuestionTracker questionNumber={questionNumber} />
      </div>

      {/* Main interview card */}
      <div className="card mb-4">

        {/* Start prompt */}
        {phase === 'welcome' && currentSubject && (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1c1c27]
              border border-[#2a2a3d] flex items-center justify-center">
              <i className="fas fa-robot text-[#4f46e5] text-2xl" />
            </div>
            <h2 className="text-lg font-semibold text-[#f0f0ff] mb-2">
              Ready to begin?
            </h2>
            <p className="text-sm text-[#8b8ba8] mb-6">
              Natalie will ask you 5 questions on{' '}
              <span className="text-[#f0f0ff] font-medium">{currentSubject}</span>
            </p>
            <Button label="Start Interview" onClick={startInterview} />
          </div>
        )}

        {/* Active recording view */}
        {phase === 'active' && (
          <div className="animate-fade-in">
            <SpeakingBubble visible={isSpeaking} />

            {!isSpeaking && (
              <div className="flex flex-col items-center gap-6 py-4">
                <RecordButton
                  isRecording={isRecording}
                  disabled={isSpeaking}
                  onClick={toggleRecording}
                />
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm text-[#8b8ba8] text-center"
                >
                  {recordingStatus}
                </p>
                {recordedBlob && !isRecording && (
                  <Button label="Submit Answer" onClick={submitAnswer} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* End interview button */}
      {phase === 'active' && !isSpeaking && (
        <div className="text-center">
          <button
            onClick={endInterview}
            className="text-xs text-[#4a4a6a] hover:text-[#8b8ba8]
              transition-colors duration-200"
          >
            End interview early
          </button>
        </div>
      )}
    </div>
  );
}

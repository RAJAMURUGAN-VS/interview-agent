import type { InterviewPhase, FeedbackData, DepartmentKey, InterviewSaveType } from '../../types';
import InterviewSetup from './InterviewSetup';
import QuestionTracker from './QuestionTracker';
import SpeakingBubble from './SpeakingBubble';
import RecordButton from './RecordButton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import FeedbackSection from '../feedback/FeedbackSection';

interface Props {
  phase: InterviewPhase;
  selectedDeptKey: DepartmentKey;
  selectedSubjects: string[];
  customSubjectInput: string;
  questionNumber: number;
  recordingStatus: string;
  isSpeaking: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  feedbackData: FeedbackData | null;
  isFeedbackLoading: boolean;
  reportSaved: boolean;
  handleSelectDepartment: (key: DepartmentKey) => void;
  toggleSubject: (subject: string) => void;
  addCustomSubject: () => void;
  removeCustomSubject: (subject: string) => void;
  setCustomSubjectInput: (v: string) => void;
  startInterview: () => void;
  toggleRecording: () => void;
  submitAnswer: () => void;
  endInterview: () => void;
  getFeedback: () => void;
  resetInterview: () => void;
  handleSaveReport: (type: InterviewSaveType) => void;
}

export default function InterviewPanel(props: Props) {
  const {
    phase, selectedDeptKey, selectedSubjects, customSubjectInput, questionNumber, recordingStatus,
    isSpeaking, isRecording, recordedBlob,
    feedbackData, isFeedbackLoading, reportSaved,
    handleSelectDepartment, toggleSubject, addCustomSubject, removeCustomSubject, setCustomSubjectInput,
    startInterview, toggleRecording, submitAnswer, endInterview, getFeedback, resetInterview, handleSaveReport,
  } = props;

  // Welcome / Setup phase
  if (phase === 'welcome') {
    return (
      <InterviewSetup
        selectedDeptKey={selectedDeptKey}
        selectedSubjects={selectedSubjects}
        customSubjectInput={customSubjectInput}
        onSelectDept={handleSelectDepartment}
        onToggleSubject={toggleSubject}
        onCustomInputChange={setCustomSubjectInput}
        onCustomSubjectAdd={addCustomSubject}
        onCustomSubjectRemove={removeCustomSubject}
        onStart={startInterview}
      />
    );
  }

  // Feedback phase
  if (phase === 'feedback') {
    return (
      <FeedbackSection
        isFeedbackLoading={isFeedbackLoading}
        feedbackData={feedbackData}
        reportSaved={reportSaved}
        onGetFeedback={getFeedback}
        onNewInterview={resetInterview}
        onSaveReport={handleSaveReport}
      />
    );
  }

  const subjectStr = selectedDeptKey === 'self-intro'
    ? 'Self Introduction'
    : selectedSubjects.join(', ');

  // Active interview phase
  return (
    <div className="animate-fade-in">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6 sm:mb-8">
        {subjectStr && <Badge subject={subjectStr} />}
        <QuestionTracker questionNumber={questionNumber} />
      </div>

      {/* Main interview card */}
      <div className="card mb-4">

        {/* Active recording view */}
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
      </div>

      {/* End interview button */}
      {!isSpeaking && (
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

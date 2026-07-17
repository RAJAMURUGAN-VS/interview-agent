import type { InterviewPhase, FeedbackData, DepartmentKey, InterviewSaveType } from '../../types';
import { useState } from 'react';
import InterviewSetup from './InterviewSetup';
import QuestionTracker from './QuestionTracker';
import SpeakingBubble from './SpeakingBubble';
import RecordButton from './RecordButton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import FeedbackSection from '../feedback/FeedbackSection';
import HistoryPanel from '../history/HistoryPanel';
import InterviewHistoryCard from '../history/InterviewHistoryCard';
import HistoryEmpty from '../history/HistoryEmpty';
import { useInterviewHistory } from '../../hooks/useHistory';

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
  canRepeat: boolean;
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
  reRecord: () => void;
  repeatAudio: () => void;
  submitAnswer: () => void;
  endInterview: () => void;
  getFeedback: () => void;
  resetInterview: () => void;
  handleSaveReport: (type: InterviewSaveType) => void;
}

export default function InterviewPanel(props: Props) {
  const {
    phase, selectedDeptKey, selectedSubjects, customSubjectInput, questionNumber, recordingStatus,
    isSpeaking, isRecording, recordedBlob, canRepeat,
    feedbackData, isFeedbackLoading, reportSaved,
    handleSelectDepartment, toggleSubject, addCustomSubject, removeCustomSubject, setCustomSubjectInput,
    startInterview, toggleRecording, reRecord, repeatAudio, submitAnswer, endInterview, getFeedback, resetInterview, handleSaveReport,
  } = props;

  const [historyOpen, setHistoryOpen] = useState(false);
  const { entries, deleteEntry, refresh } = useInterviewHistory();

  // Welcome / Setup phase
  if (phase === 'welcome') {
    return (
      <>
        {/* History button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { refresh(); setHistoryOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              border border-[#2a2a3d] text-xs font-medium text-[#8b8ba8]
              hover:border-[#4f46e5] hover:text-[#f0f0ff]
              transition-all duration-200"
          >
            <i className="fas fa-clock-rotate-left text-[#4f46e5]" />
            History
            {entries.length > 0 && (
              <span className="ml-0.5 bg-[#4f46e5] text-white text-[10px]
                w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {entries.length}
              </span>
            )}
          </button>
        </div>
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
        <HistoryPanel
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="Interview History"
        >
          {entries.length === 0 ? (
            <HistoryEmpty message="Complete an interview and save your report to see it here." />
          ) : (
            entries.map((entry) => (
              <InterviewHistoryCard
                key={entry.id}
                entry={entry}
                onDelete={deleteEntry}
              />
            ))
          )}
        </HistoryPanel>
      </>
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

          {/* Repeat button — visible while AI is speaking or after it finishes */}
          {(isSpeaking || canRepeat) && (
            <div className="flex justify-end mb-3">
              <button
                onClick={repeatAudio}
                disabled={isSpeaking}
                title="Listen to the question again"
                aria-label="Repeat question"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  border transition-all duration-200
                  ${
                    isSpeaking
                      ? 'border-[#2a2a3d] text-[#4a4a6a] cursor-not-allowed opacity-50'
                      : 'border-[#4f46e5]/50 text-[#a5b4fc] hover:border-[#4f46e5] hover:bg-[#4f46e5]/10 hover:text-[#f0f0ff] active:scale-95'
                  }`}
              >
                <i className="fas fa-rotate-left text-[11px]" />
                Repeat question
              </button>
            </div>
          )}

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

              {/* Action buttons after recording */}
              {recordedBlob && !isRecording && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <Button label="Submit Answer" onClick={submitAnswer} />

                  {/* Re-record button */}
                  <button
                    onClick={reRecord}
                    aria-label="Re-record answer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium
                      border border-[#2a2a3d] text-[#8b8ba8]
                      hover:border-[#ef4444]/50 hover:text-[#f87171] hover:bg-[#ef4444]/5
                      transition-all duration-200 active:scale-95"
                  >
                    <i className="fas fa-arrow-rotate-left text-[11px]" />
                    Re-record answer
                  </button>
                </div>
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

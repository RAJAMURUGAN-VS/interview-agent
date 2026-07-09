import { useInterview } from '../hooks/useInterview';
import InterviewPanel from '../components/interview/InterviewPanel';

export default function InterviewPage() {
  const interview = useInterview();

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-2">
          Mock Technical Interview
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          Natalie AI
        </h1>
        <p className="text-sm text-[#8b8ba8]">
          Practice mock placement interviews and get instant feedback
        </p>
      </div>

      <InterviewPanel
        phase={interview.phase}
        selectedDeptKey={interview.selectedDeptKey}
        selectedSubjects={interview.selectedSubjects}
        customSubjectInput={interview.customSubjectInput}
        questionNumber={interview.questionNumber}
        recordingStatus={interview.recordingStatus}
        isSpeaking={interview.isSpeaking}
        isRecording={interview.isRecording}
        recordedBlob={interview.recordedBlob}
        feedbackData={interview.feedbackData}
        isFeedbackLoading={interview.isFeedbackLoading}
        handleSelectDepartment={interview.handleSelectDepartment}
        toggleSubject={interview.toggleSubject}
        addCustomSubject={interview.addCustomSubject}
        removeCustomSubject={interview.removeCustomSubject}
        setCustomSubjectInput={interview.setCustomSubjectInput}
        startInterview={interview.startInterview}
        toggleRecording={interview.toggleRecording}
        submitAnswer={interview.submitAnswer}
        endInterview={interview.endInterview}
        getFeedback={interview.getFeedback}
        resetInterview={interview.resetInterview}
      />
    </div>
  );
}

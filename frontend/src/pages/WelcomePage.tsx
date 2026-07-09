import { useNavigate } from 'react-router-dom';
import { useInterview } from '../hooks/useInterview';
import SubjectSelector from '../components/interview/SubjectSelector';
import InterviewPanel from '../components/interview/InterviewPanel';

export default function WelcomePage() {
  const navigate = useNavigate();
  const interview = useInterview();

  const handleSelectSubject = (subject: string) => {
    interview.selectSubject(subject as any);
    // After selecting subject, show the "Ready to begin?" screen in InterviewPanel
    // No navigation needed — stay on welcome page and let InterviewPanel handle it
  };

  const handleSelectDept = (key: any) => {
    interview.handleSelectDepartment(key);
  };

  const handleBackToDepts = () => {
    interview.handleBackToDepts();
  };

  const handleResetInterview = () => {
    interview.resetInterview();
  };

  // If a subject is selected, show the interview panel instead of selector
  if (interview.currentSubject) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        <InterviewPanel
          phase={interview.phase}
          currentSubject={interview.currentSubject}
          selectionStep={interview.selectionStep}
          selectedDeptKey={interview.selectedDeptKey}
          questionNumber={interview.questionNumber}
          recordingStatus={interview.recordingStatus}
          isSpeaking={interview.isSpeaking}
          isRecording={interview.isRecording}
          recordedBlob={interview.recordedBlob}
          feedbackData={interview.feedbackData}
          isFeedbackLoading={interview.isFeedbackLoading}
          selectSubject={interview.selectSubject}
          handleSelectDepartment={interview.handleSelectDepartment}
          handleBackToDepts={interview.handleBackToDepts}
          startInterview={interview.startInterview}
          toggleRecording={interview.toggleRecording}
          submitAnswer={interview.submitAnswer}
          endInterview={interview.endInterview}
          getFeedback={interview.getFeedback}
          resetInterview={handleResetInterview}
        />
      </div>
    );
  }

  // Show department/subject selector
  return (
    <div className="animate-fade-in">
      <SubjectSelector
        selectionStep={interview.selectionStep}
        selectedDeptKey={interview.selectedDeptKey}
        onSelectDept={handleSelectDept}
        onSelectSubject={handleSelectSubject}
        onBackToDepts={handleBackToDepts}
      />
    </div>
  );
}

import { useInterview } from './hooks/useInterview';
import AppShell from './components/layout/AppShell';
import SubjectSelector from './components/interview/SubjectSelector';
import InterviewPanel from './components/interview/InterviewPanel';
import FeedbackSection from './components/feedback/FeedbackSection';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  const interview = useInterview();

  return (
    <AppShell>
      {interview.phase === 'welcome' && (
        <SubjectSelector
          onSelect={interview.selectSubject}
          activeSubject={interview.currentSubject}
        />
      )}
      {interview.phase === 'active' && (
        <ErrorBoundary>
          <InterviewPanel
            currentSubject={interview.currentSubject}
            questionNumber={interview.questionNumber}
            isSpeaking={interview.isSpeaking}
            isRecording={interview.isRecording}
            recordedBlob={interview.recordedBlob}
            recordingStatus={interview.recordingStatus}
            feedbackData={interview.feedbackData}
            isFeedbackLoading={interview.isFeedbackLoading}
            startInterview={interview.startInterview}
            toggleRecording={interview.toggleRecording}
            submitAnswer={interview.submitAnswer}
            endInterview={interview.endInterview}
          />
        </ErrorBoundary>
      )}
      {interview.phase === 'feedback' && (
        <ErrorBoundary>
          <FeedbackSection
            isFeedbackLoading={interview.isFeedbackLoading}
            feedbackData={interview.feedbackData}
            currentSubject={interview.currentSubject}
            onGetFeedback={interview.getFeedback}
            onNewInterview={interview.resetInterview}
          />
        </ErrorBoundary>
      )}
    </AppShell>
  );
}

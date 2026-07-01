import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { subjectSlugs } from '../types/interview';
import { useInterview } from '../hooks/useInterview';
import Sidebar from '../components/layout/Sidebar';
import InterviewPanel from '../components/interview/InterviewPanel';
import ErrorBoundary from '../components/ui/ErrorBoundary';

export default function InterviewPage() {
  const { subject: slugParam } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const subject = slugParam ? subjectSlugs[slugParam] : undefined;
  const interview = useInterview();

  // Set subject when page loads or slug changes
  useEffect(() => {
    if (!subject) return;
    if (interview.currentSubject !== subject) {
      interview.selectSubject(subject);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // Navigate to feedback URL when interview completes
  useEffect(() => {
    if (interview.phase === 'feedback' && slugParam) {
      navigate(`/interview/${slugParam}/feedback`, { replace: true });
    }
  }, [interview.phase, slugParam, navigate]);

  if (!subject) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
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
    </div>
  );
}

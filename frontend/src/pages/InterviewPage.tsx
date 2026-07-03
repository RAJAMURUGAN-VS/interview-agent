import { useEffect, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { subjectSlugs } from '../types/interview';
import { useInterview } from '../hooks/useInterview';
import InterviewPanel from '../components/interview/InterviewPanel';

export default function InterviewPage() {
  const { subject: slugParam } = useParams<{ subject: string }>();
  const navigate = useNavigate();

  const subject = useMemo(
    () => (slugParam ? subjectSlugs[slugParam] : undefined),
    [slugParam]
  );

  const interview = useInterview();

  // Set subject when URL changes
  useEffect(() => {
    if (subject && interview.currentSubject !== subject) {
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

  if (!subject) return <Navigate to="/interview" replace />;

  return (
    <InterviewPanel
      phase={interview.phase}
      currentSubject={interview.currentSubject}
      questionNumber={interview.questionNumber}
      recordingStatus={interview.recordingStatus}
      isSpeaking={interview.isSpeaking}
      isRecording={interview.isRecording}
      recordedBlob={interview.recordedBlob}
      feedbackData={interview.feedbackData}
      isFeedbackLoading={interview.isFeedbackLoading}
      selectSubject={interview.selectSubject}
      startInterview={interview.startInterview}
      toggleRecording={interview.toggleRecording}
      submitAnswer={interview.submitAnswer}
      endInterview={interview.endInterview}
      getFeedback={interview.getFeedback}
      resetInterview={interview.resetInterview}
    />
  );
}

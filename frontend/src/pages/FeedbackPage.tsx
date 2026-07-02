import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { subjectSlugs } from '../types/interview';
import { useInterview } from '../hooks/useInterview';
import FeedbackSection from '../components/feedback/FeedbackSection';

export default function FeedbackPage() {
  const { subject: slugParam } = useParams<{ subject: string }>();
  const navigate = useNavigate();

  const subject = slugParam ? subjectSlugs[slugParam] : undefined;
  const interview = useInterview();

  // Restore subject context if arriving directly via URL
  useEffect(() => {
    if (!subject) return;
    if (interview.currentSubject !== subject) {
      interview.selectSubject(subject);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  if (!subject) return <Navigate to="/interview" replace />;

  function handleNewInterview() {
    interview.resetInterview();
    navigate('/interview');
  }

  return (
    <FeedbackSection
      isFeedbackLoading={interview.isFeedbackLoading}
      feedbackData={interview.feedbackData}
      onGetFeedback={interview.getFeedback}
      onNewInterview={handleNewInterview}
    />
  );
}

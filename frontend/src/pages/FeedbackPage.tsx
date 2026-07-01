import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { subjectSlugs } from '../types/interview';
import { useInterview } from '../hooks/useInterview';
import Sidebar from '../components/layout/Sidebar';
import FeedbackSection from '../components/feedback/FeedbackSection';
import ErrorBoundary from '../components/ui/ErrorBoundary';

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

  if (!subject) return <Navigate to="/" replace />;

  function handleNewInterview() {
    interview.resetInterview();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
      <ErrorBoundary>
        <FeedbackSection
          isFeedbackLoading={interview.isFeedbackLoading}
          feedbackData={interview.feedbackData}
          currentSubject={interview.currentSubject}
          onGetFeedback={interview.getFeedback}
          onNewInterview={handleNewInterview}
        />
      </ErrorBoundary>
    </div>
  );
}

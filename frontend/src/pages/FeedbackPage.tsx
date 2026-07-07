import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { subjectSlugs } from '../types/interview';
import { useInterview } from '../hooks/useInterview';
import FeedbackSection from '../components/feedback/FeedbackSection';
import InterviewSubjectTabs from '../components/interview/InterviewSubjectTabs';

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
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-12">
      {/* Subject tabs */}
      <div className="mb-6">
        <InterviewSubjectTabs activeSubject={interview.currentSubject} />
      </div>

      <FeedbackSection
        isFeedbackLoading={interview.isFeedbackLoading}
        feedbackData={interview.feedbackData}
        onGetFeedback={interview.getFeedback}
        onNewInterview={handleNewInterview}
      />
    </div>
  );
}

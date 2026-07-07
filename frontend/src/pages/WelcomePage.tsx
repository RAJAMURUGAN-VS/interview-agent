import { useNavigate } from 'react-router-dom';
import type { InterviewSubject } from '../types';
import { toSlug } from '../types/interview';
import InterviewSubjectTabs from '../components/interview/InterviewSubjectTabs';

export default function WelcomePage() {
  const navigate = useNavigate();

  function handleSelect(subject: InterviewSubject) {
    navigate(`/interview/${toSlug(subject)}`);
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-12">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[#4f46e5] mb-2">
          Mock Technical Interview
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          Choose Your Subject
        </h1>
        <p className="text-[#8b8ba8] text-sm">
          Select a core CSE subject to begin your placement interview session with AI interviewer Natalie
        </p>
      </div>

      {/* Subject tabs */}
      <div className="mb-6">
        <InterviewSubjectTabs activeSubject={null} />
      </div>

      {/* Prompt card */}
      <div className="card text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1c1c27]
          border border-[#2a2a3d] flex items-center justify-center">
          <i className="fas fa-robot text-[#4f46e5] text-2xl" />
        </div>
        <p className="text-[#8b8ba8] text-sm">
          Pick a subject above to start your interview
        </p>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { SUBJECT_CONFIG } from '../ui/Badge';
import type { InterviewSubject } from '../../types';
import { toSlug } from '../../types/interview';

const SUBJECTS: InterviewSubject[] = [
  'Operating System',
  'Object Oriented Programming',
  'Database Management System',
  'Computer Networks',
];

interface Props {
  activeSubject?: InterviewSubject | null;
  // Optional override — if provided, called instead of navigating
  onSelect?: (subject: InterviewSubject) => void;
}

export default function SubjectSelector({ activeSubject, onSelect }: Props) {
  const navigate = useNavigate();

  function handleSelect(subject: InterviewSubject) {
    if (onSelect) {
      onSelect(subject);
    } else {
      navigate(`/interview/${toSlug(subject)}`);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-28 pb-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-widest
          text-[#4f46e5] mb-3">
          Mock Technical Interview
        </p>
        <h1 className="text-3xl font-bold text-[#f0f0ff] mb-3 tracking-tight">
          Choose Your Subject
        </h1>
        <p className="text-[#8b8ba8] text-sm max-w-sm mx-auto">
          Select a core CSE subject to begin your placement interview session
          with AI interviewer Natalie
        </p>
      </div>

      {/* Subject grid */}
      <div className="grid grid-cols-2 gap-4">
        {SUBJECTS.map((subject) => {
          const cfg = SUBJECT_CONFIG[subject];
          const isActive = activeSubject === subject;
          return (
            <button
              key={subject}
              onClick={() => handleSelect(subject)}
              className={`relative text-left p-5 rounded-2xl border
                transition-all duration-200 group
                ${isActive
                  ? `${cfg.bgClass} ${cfg.borderClass} shadow-lg`
                  : 'bg-[#13131a] border-[#2a2a3d] hover:border-[#4f46e5] hover:bg-[#1c1c27]'}`}
            >
              {isActive && (
                <div className={`absolute left-0 top-4 bottom-4 w-0.5
                  rounded-full ${cfg.borderClass.replace('border-', 'bg-')}`} />
              )}
              <div className={`text-2xl mb-3 ${cfg.colorClass}`}>
                <i className={cfg.icon} />
              </div>
              <div className="font-semibold text-[#f0f0ff] text-sm mb-1">
                {subject}
              </div>
              <div className={`text-xs font-medium uppercase tracking-wider
                ${isActive ? cfg.colorClass : 'text-[#4a4a6a]'}`}>
                {cfg.short}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

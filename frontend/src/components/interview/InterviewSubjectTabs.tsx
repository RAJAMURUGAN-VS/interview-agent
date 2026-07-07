import { useNavigate } from 'react-router-dom';
import type { InterviewSubject } from '../../types';
import { toSlug } from '../../types/interview';

const TABS: { subject: InterviewSubject; short: string }[] = [
  { subject: 'Operating System',            short: 'OS'   },
  { subject: 'Object Oriented Programming', short: 'OOP'  },
  { subject: 'Database Management System',  short: 'DBMS' },
  { subject: 'Computer Networks',           short: 'CN'   },
];

const TAB_COLORS: Record<string, string> = {
  OS:   'border-[#3b82f6] text-[#3b82f6] bg-[rgba(59,130,246,0.1)]',
  OOP:  'border-[#a855f7] text-[#a855f7] bg-[rgba(168,85,247,0.1)]',
  DBMS: 'border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]',
  CN:   'border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.1)]',
};

interface Props {
  activeSubject: InterviewSubject | null;
}

export default function InterviewSubjectTabs({ activeSubject }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map(({ subject, short }) => {
        const isActive = activeSubject === subject;
        return (
          <button
            key={short}
            onClick={() => navigate(`/interview/${toSlug(subject)}`)}
            className={`px-3 py-2 sm:px-4 rounded-lg border text-sm font-medium
              transition-all duration-200 touch-manipulation
              ${isActive
                ? TAB_COLORS[short]
                : 'border-[#2a2a3d] text-[#8b8ba8] bg-transparent hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
          >
            {short}
            <span className="ml-1.5 text-xs opacity-60 hidden sm:inline">
              {subject.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

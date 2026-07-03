import { useNavigate } from 'react-router-dom';
import type { InterviewSubject } from '../types';
import { toSlug } from '../types/interview';

const SUBJECTS: {
  subject: InterviewSubject;
  icon: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
}[] = [
  {
    subject: 'Operating System',
    icon: 'fas fa-server',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    desc: 'Processes, memory, scheduling & more',
  },
  {
    subject: 'Object Oriented Programming',
    icon: 'fas fa-cubes',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    desc: 'Classes, inheritance, polymorphism',
  },
  {
    subject: 'Database Management System',
    icon: 'fas fa-database',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    desc: 'SQL, normalization, transactions',
  },
  {
    subject: 'Computer Networks',
    icon: 'fas fa-network-wired',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    desc: 'OSI model, TCP/IP, protocols',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  function handleSelect(subject: InterviewSubject) {
    navigate(`/interview/${toSlug(subject)}`);
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-12 pb-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-[#4f46e5] mb-3">
          Mock Technical Interview
        </p>
        <h1 className="text-3xl font-bold text-[#f0f0ff] mb-3 tracking-tight">
          Choose Your Subject
        </h1>
        <p className="text-[#8b8ba8] text-sm max-w-sm mx-auto">
          Select a core CSE subject to begin your placement interview session with AI interviewer Natalie
        </p>
      </div>

      {/* Subject grid */}
      <div className="grid grid-cols-2 gap-4">
        {SUBJECTS.map(({ subject, icon, color, bg, border, desc }) => (
          <button
            key={subject}
            id={`subject-${toSlug(subject)}`}
            onClick={() => handleSelect(subject)}
            className={`relative text-left p-5 rounded-2xl border transition-all duration-200 group
              ${bg} ${border} hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className={`text-2xl mb-3 ${color}`}>
              <i className={icon} />
            </div>
            <div className="font-semibold text-[#f0f0ff] text-sm mb-1">{subject}</div>
            <div className="text-xs text-[#6b6b88]">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

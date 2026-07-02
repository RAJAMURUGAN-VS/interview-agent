import { NavLink, useLocation } from 'react-router-dom';
import type { InterviewSubject, NotesSubject } from '../../types';

// ── Interview subjects ──────────────────────────────────────────────────────
const INTERVIEW_SUBJECTS: {
  subject: InterviewSubject;
  slug: string;
  icon: string;
  color: string;
}[] = [
  { subject: 'Operating System',            slug: 'os',   icon: 'fas fa-server',   color: 'bg-blue-500/20 text-blue-400' },
  { subject: 'Object Oriented Programming', slug: 'oop',  icon: 'fas fa-cubes',    color: 'bg-purple-500/20 text-purple-400' },
  { subject: 'Database Management System',  slug: 'dbms', icon: 'fas fa-database', color: 'bg-yellow-500/20 text-yellow-400' },
  { subject: 'Computer Networks',           slug: 'cn',   icon: 'fas fa-network-wired', color: 'bg-green-500/20 text-green-400' },
];

// ── Notes subjects ──────────────────────────────────────────────────────────
const NOTES_SUBJECTS: {
  subject: NotesSubject;
  slug: string;
  icon: string;
  color: string;
}[] = [
  { subject: 'OS',   slug: 'os',   icon: 'fas fa-server',        color: 'bg-blue-500/20 text-blue-400' },
  { subject: 'OOP',  slug: 'oop',  icon: 'fas fa-cubes',         color: 'bg-purple-500/20 text-purple-400' },
  { subject: 'DBMS', slug: 'dbms', icon: 'fas fa-database',      color: 'bg-yellow-500/20 text-yellow-400' },
  { subject: 'CN',   slug: 'cn',   icon: 'fas fa-network-wired', color: 'bg-green-500/20 text-green-400' },
];

const FULL_NAMES: Record<string, string> = {
  OS:   'Operating System',
  OOP:  'OOP',
  DBMS: 'DBMS',
  CN:   'Computer Networks',
};

export default function Sidebar() {
  const location = useLocation();
  const isNotes = location.pathname.startsWith('/notes');

  const activeBase = `bg-gradient-to-r from-[#667eea] to-[#764ba2] border-[#667eea]
    shadow-[0_0_20px_rgba(102,126,234,0.4)] text-white`;
  const idleBase = `bg-zinc-900/30 hover:bg-zinc-800/50 border-zinc-700/50
    hover:border-zinc-500 lg:hover:translate-x-1 text-white`;

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-gradient-to-b from-[#0a0a0a] to-black
      border-b lg:border-b-0 lg:border-r border-zinc-800/50 p-4 lg:p-6 flex flex-col">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2]
          rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
          <i className="fas fa-robot text-white text-lg" />
        </div>
        <span className="font-bold text-xl tracking-tight
          bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          AI Interview
        </span>
      </div>

      {/* Interview subjects */}
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
        {isNotes ? 'Notes' : 'Interview'}
      </h3>

      <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {isNotes
          ? NOTES_SUBJECTS.map(({ subject, slug, icon, color }) => (
              <NavLink
                key={slug}
                to={`/notes/${slug}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 text-left whitespace-nowrap flex-shrink-0
                  ${isActive ? activeBase : idleBase}`
                }
              >
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                  <i className={icon} />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{subject}</span>
                  <span className="text-xs text-gray-400">{FULL_NAMES[subject]}</span>
                </div>
              </NavLink>
            ))
          : INTERVIEW_SUBJECTS.map(({ subject, slug, icon, color }) => (
              <NavLink
                key={slug}
                to={`/interview/${slug}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 text-left whitespace-nowrap flex-shrink-0
                  ${isActive ? activeBase : idleBase}`
                }
              >
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                  <i className={icon} />
                </div>
                <span className="font-medium text-sm">{subject}</span>
              </NavLink>
            ))
        }
      </nav>

      <div className="mt-auto pt-6 hidden lg:block">
        <p className="text-zinc-500 text-xs">Powered by AI</p>
      </div>
    </aside>
  );
}

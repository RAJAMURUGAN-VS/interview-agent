import { useNavigate, useParams } from 'react-router-dom';
import type { Subject } from '../../types/interview';
import { toSlug } from '../../types/interview';

const subjects: { subject: Subject; icon: string; color: string }[] = [
  { subject: 'Self Introduction', icon: 'fas fa-user',      color: 'bg-blue-500/20 text-blue-400' },
  { subject: 'Generative AI',     icon: 'fas fa-brain',     color: 'bg-purple-500/20 text-purple-400' },
  { subject: 'Python',            icon: 'fab fa-python',    color: 'bg-yellow-500/20 text-yellow-400' },
  { subject: 'English',           icon: 'fas fa-language',  color: 'bg-green-500/20 text-green-400' },
  { subject: 'HTML',              icon: 'fab fa-html5',     color: 'bg-orange-500/20 text-orange-400' },
  { subject: 'CSS',               icon: 'fab fa-css3-alt',  color: 'bg-blue-500/20 text-blue-400' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { subject: activeSlug } = useParams<{ subject?: string }>();

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-gradient-to-b from-[#0a0a0a] to-black border-b lg:border-b-0 lg:border-r border-zinc-800/50 p-4 lg:p-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
          <i className="fas fa-robot text-white text-lg" />
        </div>
        <span className="font-space font-bold text-xl tracking-tight bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          AI Interview
        </span>
      </div>

      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Select Topic</h3>

      <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {subjects.map(({ subject, icon, color }) => {
          const slug = toSlug(subject);
          const isActive = activeSlug === slug;
          return (
            <button
              key={subject}
              onClick={() => navigate(`/interview/${slug}`)}
              className={`flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 text-left whitespace-nowrap flex-shrink-0
                ${isActive
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] border-[#667eea] shadow-[0_0_20px_rgba(102,126,234,0.4)]'
                  : 'bg-zinc-900/30 hover:bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-500 lg:hover:translate-x-1'
                }`}
            >
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                <i className={icon} />
              </div>
              <span className="font-medium text-sm text-white">{subject}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 hidden lg:block">
        <p className="text-zinc-500 text-xs">Powered by AI</p>
      </div>
    </aside>
  );
}

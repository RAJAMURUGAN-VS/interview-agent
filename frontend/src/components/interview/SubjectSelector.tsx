import type { Subject } from '../../types/interview';

const subjects: { subject: Subject; icon: string; color: string }[] = [
  { subject: 'Self Introduction', icon: 'fas fa-user',       color: 'bg-blue-500/20 text-blue-400' },
  { subject: 'Generative AI',     icon: 'fas fa-brain',      color: 'bg-purple-500/20 text-purple-400' },
  { subject: 'Python',            icon: 'fab fa-python',     color: 'bg-yellow-500/20 text-yellow-400' },
  { subject: 'English',           icon: 'fas fa-language',   color: 'bg-green-500/20 text-green-400' },
  { subject: 'HTML',              icon: 'fab fa-html5',      color: 'bg-orange-500/20 text-orange-400' },
  { subject: 'CSS',               icon: 'fab fa-css3-alt',   color: 'bg-blue-500/20 text-blue-400' },
];

interface SubjectSelectorProps {
  onSelect: (subject: Subject) => void;
  activeSubject: Subject | null;
}

export default function SubjectSelector({ onSelect, activeSubject }: SubjectSelectorProps) {
  return (
    <>
      {/* Sidebar */}
      <aside className="w-full lg:w-1/5 bg-gradient-to-b from-[#0a0a0a] to-black border-b lg:border-b-0 lg:border-r border-zinc-800/50 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fas fa-robot text-white text-xl" />
          </div>
          <span className="font-space font-bold text-2xl tracking-tight bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            AI Interview
          </span>
        </div>

        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Select Topic</h3>

        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          {subjects.map(({ subject, icon, color }) => {
            const isActive = activeSubject === subject;
            return (
              <button
                key={subject}
                onClick={() => onSelect(subject)}
                className={`flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 text-left whitespace-nowrap flex-shrink-0
                  ${isActive
                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] border-[#667eea] shadow-[0_0_20px_rgba(102,126,234,0.4)]'
                    : 'bg-zinc-900/30 hover:bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-500 hover:translate-x-1'
                  }`}
              >
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                  <i className={icon} />
                </div>
                <span className="font-medium text-sm text-white">{subject}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 hidden lg:block">
          <p className="text-zinc-500 text-xs">Powered by AI</p>
        </div>
      </aside>

      {/* Welcome main area */}
      <main className="flex-1 lg:w-4/5 flex flex-col bg-black">
        <header className="px-4 lg:px-8 py-6 lg:py-8 border-b border-zinc-800/50">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-space font-bold text-3xl lg:text-5xl xl:text-6xl tracking-tight mb-3">
              <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
                Master Your Interview
              </span>
            </h1>
            <p className="text-gray-300 text-base lg:text-lg font-light">
              Ace Your Technical Interviews with AI-Powered Practice and Feedback
            </p>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-700/30 shadow-[0_0_30px_rgba(102,126,234,0.2)]">
              <i className="fas fa-microphone text-3xl lg:text-4xl text-zinc-400" />
            </div>
            <h2 className="font-space text-xl lg:text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-3">
              Ready to Practice?
            </h2>
            <p className="text-gray-400 text-sm lg:text-base">Select a topic from the sidebar to begin</p>
          </div>
        </div>
      </main>
    </>
  );
}

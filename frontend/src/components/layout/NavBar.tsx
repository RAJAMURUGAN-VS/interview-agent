import type { AppTab } from '../../types';

interface NavBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16
      bg-[#13131a] border-b border-[#2a2a3d]
      flex items-center justify-between px-6">

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center
          justify-center shadow-[0_0_12px_rgba(79,70,229,0.4)]">
          <i className="fas fa-graduation-cap text-white text-sm" />
        </div>
        <span className="font-bold text-[#f0f0ff] tracking-tight">
          PlacementPrep <span className="text-[#4f46e5]">AI</span>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0a0a0f]
        rounded-xl p-1 border border-[#2a2a3d]">
        {(['interview', 'notes'] as AppTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium
              capitalize transition-all duration-200
              ${activeTab === tab
                ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
          >
            {tab === 'interview' ? (
              <><i className="fas fa-microphone mr-2 text-xs" />Interview</>
            ) : (
              <><i className="fas fa-book-open mr-2 text-xs" />Notes</>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

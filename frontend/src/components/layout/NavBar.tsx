import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/interview', icon: 'fas fa-microphone',      label: 'Interview' },
  { to: '/notes',     icon: 'fas fa-book-open',       label: 'Notes'     },
  { to: '/pdf-chat',  icon: 'fas fa-file-pdf',        label: 'PDF Chat'  },
  { to: '/mcq',       icon: 'fas fa-circle-question', label: 'MCQ'       },
  { to: '/codefill',  icon: 'fas fa-code',            label: 'Code Fill' },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const activeClass = 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]';
  const idleClass   = 'text-[#8b8ba8] hover:text-[#f0f0ff]';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16
        bg-[#13131a] border-b border-[#2a2a3d]
        flex items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center
            justify-center shadow-[0_0_12px_rgba(79,70,229,0.4)]">
            <i className="fas fa-graduation-cap text-white text-sm" />
          </div>
          <span className="font-bold text-[#f0f0ff] tracking-tight hidden sm:block">
            PlacementPrep <span className="text-[#4f46e5]">AI</span>
          </span>
          <span className="font-bold text-[#f0f0ff] tracking-tight sm:hidden">
            Prep<span className="text-[#4f46e5]">AI</span>
          </span>
        </NavLink>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#0a0a0f]
          rounded-xl p-1 border border-[#2a2a3d]">
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? activeClass : idleClass}`
              }
            >
              <i className={`${icon} mr-1.5 text-xs`} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile: icon tabs (visible sm–md) */}
        <div className="hidden sm:flex md:hidden items-center gap-1 bg-[#0a0a0f]
          rounded-xl p-1 border border-[#2a2a3d]">
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `w-9 h-9 rounded-lg flex items-center justify-center text-sm
                transition-all duration-200
                ${isActive ? activeClass : idleClass}`
              }
            >
              <i className={`${icon} text-xs`} />
            </NavLink>
          ))}
        </div>

        {/* Hamburger (xs only) */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="sm:hidden w-9 h-9 rounded-lg border border-[#2a2a3d]
            flex items-center justify-center text-[#8b8ba8]
            hover:text-[#f0f0ff] transition-colors duration-200"
          aria-label="Toggle menu"
        >
          <i className={`fas ${menuOpen ? 'fa-xmark' : 'fa-bars'} text-sm`} />
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[#13131a]
          border-b border-[#2a2a3d] flex flex-col sm:hidden">
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 text-sm font-medium
                border-b border-[#2a2a3d] last:border-b-0
                transition-colors duration-200
                ${isActive ? 'text-[#4f46e5] bg-[#4f46e5]/5' : 'text-[#8b8ba8]'}`
              }
            >
              <i className={`${icon} w-4 text-center`} />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
}

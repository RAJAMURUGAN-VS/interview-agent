import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

const TABS = [
  { to: '/interview', icon: 'fas fa-microphone',      label: 'Interview' },
  { to: '/notes',     icon: 'fas fa-book-open',       label: 'Notes'     },
  { to: '/pdf-chat',  icon: 'fas fa-file-pdf',        label: 'PDF Chat'  },
  { to: '/mcq',       icon: 'fas fa-circle-question', label: 'MCQ'       },
  { to: '/codefill',  icon: 'fas fa-code',            label: 'Code Fill' },
  { to: '/insights',  icon: 'fas fa-lightbulb',       label: 'Insights'  },
  { to: '/doubt-solver', icon: 'fas fa-brain',        label: 'Doubt Solver' },
  { to: '/playlist',  icon: 'fas fa-route',           label: 'Playlist'  },
  { to: '/prep-plan', icon: 'fas fa-calendar-check',  label: 'Prep Plan' },
];


export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme } = useTheme();
  const { user, signOut } = useAuth();

  const bgClass = theme === 'dark' ? 'bg-[#13131a] border-[#2a2a3d]' : 'bg-white border-[#d9d9e6]';
  const tabsBgClass = theme === 'dark' ? 'bg-[#0a0a0f]' : 'bg-[#f8f9fa]';
  const textIdleClass = theme === 'dark' ? 'text-[#8b8ba8] hover:text-[#f0f0ff]' : 'text-[#4a4a5e] hover:text-[#1a1a1a]';
  const mobileMenuBgClass = theme === 'dark' ? 'bg-[#13131a] border-[#2a2a3d]' : 'bg-white border-[#d9d9e6]';
  const mobileItemBgClass = theme === 'dark' ? 'text-[#4f46e5] bg-[#4f46e5]/5' : 'text-[#4f46e5] bg-[#4f46e5]/5';
  const mobileBorderClass = theme === 'dark' ? 'border-[#2a2a3d]' : 'border-[#d9d9e6]';

  const activeClass = 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]';

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-16
        border-b flex items-center justify-between px-4 sm:px-6 transition-colors duration-300
        ${bgClass}`}>

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#4f46e5] flex items-center
            justify-center shadow-[0_0_12px_rgba(79,70,229,0.4)]">
            <i className="fas fa-graduation-cap text-white text-sm" />
          </div>
          <span className={`font-bold tracking-tight ${
            theme === 'dark' ? 'text-[#f0f0ff]' : 'text-gray-900'
          }`}>
            MENTRA 
          </span>
        </NavLink>

        {/* Desktop tabs */}
        <div className={`hidden md:flex items-center gap-1
          rounded-xl p-1 border transition-colors duration-300
          ${tabsBgClass} ${bgClass}`}>
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? activeClass : textIdleClass}`
              }
            >
              <i className={`${icon} mr-1.5 text-xs`} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile: icon tabs (visible sm–md) */}
        <div className={`hidden sm:flex md:hidden items-center gap-1
          rounded-xl p-1 border transition-colors duration-300
          ${tabsBgClass} ${bgClass}`}>
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `w-9 h-9 rounded-lg flex items-center justify-center text-sm
                transition-all duration-200
                ${isActive ? activeClass : textIdleClass}`
              }
            >
              <i className={`${icon} text-xs`} />
            </NavLink>
          ))}
        </div>

        {/* Right side: Theme Toggle, User Menu, Hamburger */}
        <div className="flex items-center gap-3 ml-auto md:ml-3">
          <ThemeToggle />

          {/* Logout Button - Desktop */}
          {user && (
            <button
              onClick={() => signOut()}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200
                ${theme === 'dark'
                  ? 'border-[#2a2a3d] text-[#ef4444] hover:bg-[#ef4444]/10'
                  : 'border-[#d9d9e6] text-[#dc2626] hover:bg-[#dc2626]/10'
                }`}
              title="Log out"
            >
              <i className="fas fa-sign-out-alt text-sm" />
            </button>
          )}
          
          {/* Hamburger (xs only) */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`sm:hidden w-9 h-9 rounded-lg border
              flex items-center justify-center transition-colors duration-200
              ${theme === 'dark'
                ? 'border-[#2a2a3d] text-[#8b8ba8] hover:text-[#f0f0ff]'
                : 'border-[#d9d9e6] text-[#4a4a5e] hover:text-[#1a1a1a]'
              }`}
            aria-label="Toggle menu"
          >
            <i className={`fas ${menuOpen ? 'fa-xmark' : 'fa-bars'} text-sm`} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className={`fixed top-16 left-0 right-0 z-40 border-b flex flex-col sm:hidden
          transition-colors duration-300 ${mobileMenuBgClass}`}>
          {TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 text-sm font-medium
                border-b last:border-b-0 transition-colors duration-200
                ${mobileBorderClass}
                ${isActive ? mobileItemBgClass : (theme === 'dark' ? 'text-[#8b8ba8]' : 'text-[#4a4a5e]')}`
              }
            >
              <i className={`${icon} w-4 text-center`} />
              {label}
            </NavLink>
          ))}
          
          {/* Mobile Logout Button */}
          {user && (
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className={`flex items-center gap-3 px-6 py-4 text-sm font-medium w-full
                border-t text-left transition-colors duration-200
                ${mobileBorderClass}
                ${theme === 'dark'
                  ? 'text-[#ef4444] hover:bg-[#ef4444]/10'
                  : 'text-[#dc2626] hover:bg-[#dc2626]/10'
                }`}
              title="Log out"
            >
              <i className="fas fa-sign-out-alt w-4 text-center" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

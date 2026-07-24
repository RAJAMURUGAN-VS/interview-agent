import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        w-10 h-10 rounded-lg flex items-center justify-center
        transition-all duration-200 border
        ${theme === 'dark'
          ? 'bg-[#1c1c27] border-[#2a2a3d] text-[#f59e0b] hover:bg-[#2a2a3d]'
          : 'bg-[#f8f9fa] border-[#d9d9e6] text-[#f59e0b] hover:bg-[#eff0f4]'
        }
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <i className="fas fa-sun text-sm" />
      ) : (
        <i className="fas fa-moon text-sm" />
      )}
    </button>
  );
}

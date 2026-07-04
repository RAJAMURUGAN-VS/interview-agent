import type { ChatMode } from '../../types';

interface ModeToggleProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const activeClass =
    'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]';
  const idleClass =
    'text-[#8b8ba8] hover:text-[#f0f0ff]';

  return (
    <div className="flex items-center gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d] w-fit">
      <button
        type="button"
        onClick={() => onChange('text')}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          ${mode === 'text' ? activeClass : idleClass}`}
      >
        <i className="fas fa-keyboard mr-2 text-xs" />
        Text
      </button>

      <button
        type="button"
        onClick={() => onChange('speech')}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          ${mode === 'speech' ? activeClass : idleClass}`}
      >
        <i className="fas fa-microphone mr-2 text-xs" />
        Speech
      </button>
    </div>
  );
}

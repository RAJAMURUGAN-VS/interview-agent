import { useEffect } from 'react';

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  title:     string;
  children:  React.ReactNode;
}

export default function HistoryPanel({
  isOpen, onClose, title, children }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40
          animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over panel — right side */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md
        bg-[#13131a] border-l border-[#2a2a3d] z-50 flex flex-col
        shadow-2xl"
        style={{ animation: 'slideInRight 250ms ease forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
          border-b border-[#2a2a3d] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <i className="fas fa-clock-rotate-left text-[#4f46e5] text-sm" />
            <h2 className="text-base font-semibold text-[#f0f0ff]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close history panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[#8b8ba8] hover:text-[#f0f0ff] hover:bg-[#1c1c27]
              transition-all duration-150"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {children}
        </div>
      </div>
    </>
  );
}

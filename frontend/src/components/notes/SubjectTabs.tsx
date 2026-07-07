import type { NotesSubject } from '../../types';
import { NOTES_SUBJECT_LABELS } from '../../utils/pdfConfig';

const TABS: NotesSubject[] = ['OS', 'OOP', 'DBMS', 'CN'];

const TAB_COLORS: Record<NotesSubject, string> = {
  OS:   'border-[#3b82f6] text-[#3b82f6] bg-[rgba(59,130,246,0.1)]',
  OOP:  'border-[#a855f7] text-[#a855f7] bg-[rgba(168,85,247,0.1)]',
  DBMS: 'border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]',
  CN:   'border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.1)]',
};

interface Props {
  activeSubject: NotesSubject;
  onSelect: (s: NotesSubject) => void;
}

export default function SubjectTabs({ activeSubject, onSelect }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onSelect(tab)}
          className={`px-3 py-2 sm:px-4 rounded-lg border text-sm font-medium
            transition-all duration-200 touch-manipulation
            ${activeSubject === tab
              ? TAB_COLORS[tab]
              : 'border-[#2a2a3d] text-[#8b8ba8] bg-transparent hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
        >
          {tab}
          <span className="ml-1.5 text-xs opacity-60 hidden sm:inline">
            {NOTES_SUBJECT_LABELS[tab].split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  );
}

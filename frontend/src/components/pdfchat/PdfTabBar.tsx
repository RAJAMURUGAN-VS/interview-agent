import type { PdfTab } from '../../types';

interface Props {
  tabs: PdfTab[];
  activeThreadId: string | null;
  showUploadPanel: boolean;
  onSelectTab: (threadId: string) => void;
  onCloseTab:  (threadId: string) => void;
  onAddPdf:    () => void;
}

export default function PdfTabBar({
  tabs, activeThreadId, showUploadPanel,
  onSelectTab, onCloseTab, onAddPdf,
}: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0
      border-b border-[#2a2a3d] mb-0 scrollbar-thin">

      {/* Existing PDF tabs */}
      {tabs.map((tab) => {
        const isActive = tab.threadId === activeThreadId && !showUploadPanel;

        return (
          <div
            key={tab.threadId}
            className={`group flex items-center gap-2 px-4 py-2.5
              rounded-t-lg border border-b-0 text-sm font-medium
              cursor-pointer flex-shrink-0 max-w-[200px]
              transition-all duration-150
              ${isActive
                ? 'bg-[#13131a] border-[#2a2a3d] text-[#f0f0ff]'
                : 'bg-[#0a0a0f] border-transparent text-[#8b8ba8] hover:text-[#f0f0ff] hover:bg-[#1c1c27]'}`}
            onClick={() => onSelectTab(tab.threadId)}
          >
            {/* PDF icon */}
            <i className="fas fa-file-pdf text-[#4f46e5] text-xs flex-shrink-0" />

            {/* Filename — truncated */}
            <span className="truncate max-w-[120px]" title={tab.fileName}>
              {tab.fileName.replace(/\.pdf$/i, '')}
            </span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.threadId);
              }}
              className={`flex-shrink-0 w-4 h-4 rounded flex items-center
                justify-center text-[10px] transition-all duration-150
                opacity-0 group-hover:opacity-100
                ${isActive ? 'opacity-60' : ''}
                hover:bg-[#2a2a3d] hover:text-[#ef4444] text-[#8b8ba8]`}
              aria-label={`Close ${tab.fileName}`}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        );
      })}

      {/* "+ Add PDF" button */}
      <button
        onClick={onAddPdf}
        className={`flex items-center gap-1.5 px-3 py-2.5
          rounded-t-lg border border-b-0 text-sm flex-shrink-0
          transition-all duration-150
          ${showUploadPanel
            ? 'bg-[#13131a] border-[#2a2a3d] text-[#4f46e5]'
            : 'bg-[#0a0a0f] border-transparent text-[#8b8ba8] hover:text-[#4f46e5] hover:bg-[#1c1c27]'}`}
        aria-label="Add a new PDF"
      >
        <i className="fas fa-plus text-xs" />
        <span className="font-medium">Add PDF</span>
      </button>
    </div>
  );
}

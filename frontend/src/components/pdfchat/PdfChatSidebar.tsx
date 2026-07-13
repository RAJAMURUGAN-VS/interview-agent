import type { PdfChatHistoryEntry } from '../../types';

// ── Relative time helper ──────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── History card — click to reopen as tab ─────────────────────────────────
function HistoryCard({
  entry, onRestore, onDelete,
}: {
  entry:     PdfChatHistoryEntry;
  onRestore: (entry: PdfChatHistoryEntry) => void;
  onDelete:  (id: string) => void;
}) {
  return (
    <div
      className="group rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: 'rgba(22,22,32,0.7)', border: '1px solid rgba(42,42,61,0.7)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.border = '1px solid rgba(79,70,229,0.3)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(28,28,42,0.9)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.border = '1px solid rgba(42,42,61,0.7)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(22,22,32,0.7)';
      }}
    >
      {/* Main clickable area */}
      <button
        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5"
        onClick={() => onRestore(entry)}
        title="Open this conversation"
      >
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          <i className="fas fa-file-pdf text-[#ef4444] text-xs" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: '#9090b8' }}>
            {entry.fileName.replace(/\.pdf$/i, '')}
          </p>
          <div className="flex items-center gap-2 mt-0.5" style={{ color: '#3a3a5a' }}>
            <span className="text-[10px]">
              <i className="fas fa-message mr-1" />
              {entry.messageCount} msgs
            </span>
            <span className="text-[10px]">{relativeTime(entry.savedAt)}</span>
          </div>
        </div>

        {/* "Open" badge — visible on hover */}
        <span
          className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md
            opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{
            background: 'rgba(79,70,229,0.15)',
            color: '#818cf8',
            border: '1px solid rgba(79,70,229,0.25)',
          }}
        >
          Open
        </span>
      </button>

      {/* Delete row — appears on hover */}
      <div className="flex items-center gap-2 px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="flex-1 h-px" style={{ background: 'rgba(42,42,61,0.5)' }} />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          className="flex items-center gap-1 text-[10px] transition-colors duration-150"
          style={{ color: '#3a3a5a' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3a3a5a')}
          aria-label="Delete"
        >
          <i className="fas fa-trash text-[9px]" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────
function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#3a3a5a' }}>
        {label}
      </p>
      {count > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(79,70,229,0.15)', color: '#6060a8' }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'rgba(42,42,61,0.6)' }} />
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────

interface Props {
  closedEntries:    PdfChatHistoryEntry[];
  onDeleteClosed:   (id: string) => void;
  onRestoreEntry:   (entry: PdfChatHistoryEntry) => void;
  isCollapsed:      boolean;
  onToggleCollapse: () => void;
}

export default function PdfChatSidebar({
  closedEntries,
  onDeleteClosed,
  onRestoreEntry,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-300"
      style={{
        width: isCollapsed ? '48px' : '264px',
        minHeight: '100%',
        background: 'rgba(11,11,18,0.98)',
        borderRight: '1px solid rgba(42,42,61,0.6)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(42,42,61,0.6)' }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(79,70,229,0.15)' }}
            >
              <i className="fas fa-clock-rotate-left text-[#4f46e5] text-xs" />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#d0d0f0' }}>
              Chat History
            </span>
            {closedEntries.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'rgba(79,70,229,0.2)',
                  color: '#818cf8',
                  border: '1px solid rgba(79,70,229,0.3)',
                }}
              >
                {closedEntries.length}
              </span>
            )}
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0"
          style={{ color: '#3a3a5a' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#d0d0f0';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#3a3a5a';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          title={isCollapsed ? 'Expand history' : 'Collapse history'}
          aria-label={isCollapsed ? 'Expand history' : 'Collapse history'}
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`} />
        </button>
      </div>

      {/* ── Collapsed icon rail ──────────────────────────────────────────── */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-4 gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(79,70,229,0.1)' }}
            title="Chat History"
          >
            <i className="fas fa-history text-[#4f46e5] text-xs" />
          </div>
          {closedEntries.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(79,70,229,0.2)', color: '#818cf8' }}
            >
              {closedEntries.length}
            </span>
          )}
        </div>
      )}

      {/* ── Expanded list ────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col min-h-0">

          {closedEntries.length > 0 ? (
            <>
              <SectionLabel label="History" count={closedEntries.length} />
              <div className="flex flex-col gap-1.5">
                {closedEntries.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onRestore={onRestoreEntry}
                    onDelete={onDeleteClosed}
                  />
                ))}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(28,28,39,0.6)', border: '1px solid rgba(42,42,61,0.6)' }}
              >
                <i className="fas fa-file-pdf text-sm" style={{ color: '#2a2a3d' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#3a3a5a' }}>No history yet</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#2a2a3d' }}>
                  Closed chats will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div
          className="px-3 py-2 flex-shrink-0 flex items-center gap-1.5"
          style={{ borderTop: '1px solid rgba(42,42,61,0.5)' }}
        >
          <i className="fas fa-database text-[9px]" style={{ color: '#2a2a3d' }} />
          <p className="text-[10px]" style={{ color: '#2a2a3d' }}>
            Saved to localStorage · Vectors in IndexedDB
          </p>
        </div>
      )}
    </aside>
  );
}

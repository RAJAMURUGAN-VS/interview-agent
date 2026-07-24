import { useTheme } from '../../context/ThemeContext';
import type { PdfChatHistoryEntry } from '../../types';

// ── Relative time helper ──────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days  < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Theme-aware color tokens ──────────────────────────────────────────────
function useColors(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return {
    // Sidebar container
    sidebarBg:       isDark ? 'rgba(11,11,18,0.98)'      : '#ffffff',
    sidebarBorder:   isDark ? 'rgba(42,42,61,0.6)'       : '#e2e8f0',

    // Header / footer dividers
    divider:         isDark ? 'rgba(42,42,61,0.6)'       : '#e2e8f0',

    // History card
    cardBg:          isDark ? 'rgba(22,22,32,0.7)'       : '#f8f9fa',
    cardBorder:      isDark ? 'rgba(42,42,61,0.7)'       : '#e2e8f0',
    cardBgHover:     isDark ? 'rgba(28,28,42,0.9)'       : '#f0f2f8',
    cardBorderHover: isDark ? 'rgba(79,70,229,0.3)'      : 'rgba(79,70,229,0.4)',

    // Text
    textPrimary:     isDark ? '#9090b8'                  : '#1e293b',
    textSecondary:   isDark ? '#3a3a5a'                  : '#64748b',
    textMuted:       isDark ? '#2a2a3d'                  : '#94a3b8',
    textHeading:     isDark ? '#d0d0f0'                  : '#0f172a',

    // Accents
    accentBg:        isDark ? 'rgba(79,70,229,0.15)'     : 'rgba(79,70,229,0.10)',
    accentBgBold:    isDark ? 'rgba(79,70,229,0.2)'      : 'rgba(79,70,229,0.12)',
    accentBorder:    isDark ? 'rgba(79,70,229,0.3)'      : 'rgba(79,70,229,0.25)',
    accentText:      isDark ? '#818cf8'                  : '#4f46e5',
    accentCount:     isDark ? '#6060a8'                  : '#4f46e5',

    // Icon PDF
    pdfIconBg:       isDark ? 'rgba(239,68,68,0.1)'      : 'rgba(239,68,68,0.08)',

    // Toggle button
    toggleColor:     isDark ? '#3a3a5a'                  : '#94a3b8',
    toggleHoverBg:   isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.06)',
    toggleHoverColor:isDark ? '#d0d0f0'                  : '#0f172a',

    // Empty state
    emptyIconBg:     isDark ? 'rgba(28,28,39,0.6)'       : '#f1f5f9',
    emptyIconBorder: isDark ? 'rgba(42,42,61,0.6)'       : '#e2e8f0',
    emptyIconColor:  isDark ? '#2a2a3d'                  : '#94a3b8',

    // Section divider line
    sectionLine:     isDark ? 'rgba(42,42,61,0.6)'       : '#e2e8f0',
  };
}

// ── History card ──────────────────────────────────────────────────────────
function HistoryCard({
  entry, onRestore, onDelete, colors,
}: {
  entry:     PdfChatHistoryEntry;
  onRestore: (entry: PdfChatHistoryEntry) => void;
  onDelete:  (id: string) => void;
  colors:    ReturnType<typeof useColors>;
}) {
  return (
    <div
      className="group rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.border      = `1px solid ${colors.cardBorderHover}`;
        (e.currentTarget as HTMLElement).style.background  = colors.cardBgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.border      = `1px solid ${colors.cardBorder}`;
        (e.currentTarget as HTMLElement).style.background  = colors.cardBg;
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
          style={{ background: colors.pdfIconBg }}
        >
          <i className="fas fa-file-pdf text-[#ef4444] text-xs" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: colors.textPrimary }}>
            {entry.fileName.replace(/\.pdf$/i, '')}
          </p>
          <div className="flex items-center gap-2 mt-0.5" style={{ color: colors.textSecondary }}>
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
            background: colors.accentBg,
            color:      colors.accentText,
            border:     `1px solid ${colors.accentBorder}`,
          }}
        >
          Open
        </span>
      </button>

      {/* Delete row — appears on hover */}
      <div className="flex items-center gap-2 px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="flex-1 h-px" style={{ background: colors.divider }} />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          className="flex items-center gap-1 text-[10px] transition-colors duration-150"
          style={{ color: colors.textSecondary }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = colors.textSecondary)}
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
function SectionLabel({ label, count, colors }: {
  label:  string;
  count:  number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: colors.textSecondary }}>
        {label}
      </p>
      {count > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: colors.accentBg, color: colors.accentCount }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: colors.sectionLine }} />
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
  const { theme } = useTheme();
  const colors    = useColors(theme);

  // ── Shared inner panel content ──────────────────────────────────────────
  const panelContent = (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${colors.divider}` }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: colors.accentBg }}
            >
              <i className="fas fa-clock-rotate-left text-[#4f46e5] text-xs" />
            </div>
            <span className="text-xs font-semibold" style={{ color: colors.textHeading }}>
              Chat History
            </span>
            {closedEntries.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: colors.accentBgBold,
                  color:      colors.accentText,
                  border:     `1px solid ${colors.accentBorder}`,
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
          style={{ color: colors.toggleColor }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color      = colors.toggleHoverColor;
            (e.currentTarget as HTMLElement).style.background = colors.toggleHoverBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color      = colors.toggleColor;
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          title={isCollapsed ? 'Expand history' : 'Collapse history'}
          aria-label={isCollapsed ? 'Expand history' : 'Collapse history'}
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`} />
        </button>
      </div>

      {/* Collapsed icon rail */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-4 gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: colors.accentBg }}
            title="Chat History"
          >
            <i className="fas fa-history text-[#4f46e5] text-xs" />
          </div>
          {closedEntries.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: colors.accentBgBold, color: colors.accentText }}
            >
              {closedEntries.length}
            </span>
          )}
        </div>
      )}

      {/* Expanded list */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col min-h-0">
          {closedEntries.length > 0 ? (
            <>
              <SectionLabel label="History" count={closedEntries.length} colors={colors} />
              <div className="flex flex-col gap-1.5">
                {closedEntries.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onRestore={onRestoreEntry}
                    onDelete={onDeleteClosed}
                    colors={colors}
                  />
                ))}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: colors.emptyIconBg, border: `1px solid ${colors.emptyIconBorder}` }}
              >
                <i className="fas fa-file-pdf text-sm" style={{ color: colors.emptyIconColor }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>No history yet</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: colors.textMuted }}>
                  Closed chats will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div
          className="px-3 py-2 flex-shrink-0 flex items-center gap-1.5"
          style={{ borderTop: `1px solid ${colors.divider}` }}
        >
          <i className="fas fa-database text-[9px]" style={{ color: colors.textMuted }} />
          <p className="text-[10px]" style={{ color: colors.textMuted }}>
            Saved to localStorage · Vectors in IndexedDB
          </p>
        </div>
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        MOBILE (< md): Fixed overlay drawer — does NOT compress the main content.
        A backdrop is shown when expanded; clicking it collapses the sidebar.
      */}
      <div className="md:hidden">
        {/* Backdrop — full screen, closes sidebar on tap anywhere outside */}
        {!isCollapsed && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={onToggleCollapse}
            aria-label="Close sidebar"
          />
        )}

        {/* Floating tab button — shown at top-left when collapsed */}
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="fixed left-0 z-40 w-7 h-12
              flex items-center justify-center rounded-br-xl rounded-tr-xl
              pointer-events-auto"
            style={{
              top:         '80px',
              background:  colors.sidebarBg,
              borderRight: `1px solid ${colors.sidebarBorder}`,
              borderTop:   `1px solid ${colors.sidebarBorder}`,
              borderBottom:`1px solid ${colors.sidebarBorder}`,
              color:       colors.toggleColor,
              animation:   'slideInButtonFromLeft 250ms ease forwards',
            }}
            title="Open history"
            aria-label="Open history"
          >
            <i className="fas fa-chevron-right text-xs" />
          </button>
        )}

        {/* Slide-in drawer — covers full viewport height including behind navbar */}
        {!isCollapsed && (
          <aside
            className="fixed left-0 top-0 bottom-0 z-40 flex flex-col
              transition-all duration-200"
            style={{
              width:          '264px',
              paddingTop:     '0px',   /* Remove padding - content can go under navbar */
              background:     colors.sidebarBg,
              borderRight:    `1px solid ${colors.sidebarBorder}`,
              backdropFilter: 'blur(16px)',
              animation:      'slideInFromLeft 250ms ease forwards',
              transform:      'translateX(0)',
            }}
          >
            {panelContent}
          </aside>
        )}
      </div>

      {/*
        DESKTOP (≥ md): Normal inline flex sidebar — stays in document flow.
        Width animates between 48px (collapsed) and 264px (expanded).
      */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width:           isCollapsed ? '48px' : '264px',
          minHeight:       '100%',
          background:      colors.sidebarBg,
          borderRight:     `1px solid ${colors.sidebarBorder}`,
          backdropFilter:  'blur(16px)',
        }}
      >
        {panelContent}
      </aside>
    </>
  );
}

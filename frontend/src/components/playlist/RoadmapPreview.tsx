import type { RoadmapSection } from '../../types';

interface Props {
  topic: string;
  durationHours: number;
  roadmap: RoadmapSection[];
  isLoading?: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SECTION_COLORS = [
  '#4f46e5', '#7c3aed', '#2563eb', '#0891b2',
  '#059669', '#d97706', '#dc2626', '#db2777',
  '#7c3aed', '#4f46e5', '#2563eb', '#0891b2',
];

export default function RoadmapPreview({
  topic,
  durationHours,
  roadmap,
  isLoading,
  onConfirm,
  onRegenerate,
}: Props) {
  const totalMinutes = roadmap.reduce((s, r) => s + r.targetMinutes, 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-2"
          style={{ background: 'rgba(79,70,229,0.15)', color: 'var(--accent)', border: '1px solid rgba(79,70,229,0.3)' }}
        >
          <i className="fas fa-check-circle" />
          Roadmap generated
        </div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {topic}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {roadmap.length} sections &middot; ~{formatMinutes(totalMinutes)} total
          &nbsp;(target: {durationHours}h)
        </p>
      </div>

      {/* Section cards */}
      <div className="space-y-3">
        {roadmap.map((section, idx) => {
          const color = SECTION_COLORS[idx % SECTION_COLORS.length];
          return (
            <div
              key={section.id}
              className="card animate-fade-in"
              style={{
                animationDelay: `${idx * 50}ms`,
                borderLeft: `3px solid ${color}`,
                padding: '16px 20px',
              }}
            >
              <div className="flex items-start gap-4">
                {/* Order badge */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: `${color}22`, color }}
                >
                  {section.order}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {section.title}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: `${color}18`,
                        color,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      <i className="fas fa-clock mr-1" />
                      {formatMinutes(section.targetMinutes)}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1.5 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {section.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          id="btn-regenerate-roadmap"
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <i className="fas fa-rotate-left mr-2" />
          Regenerate
        </button>
        <button
          id="btn-confirm-roadmap"
          onClick={onConfirm}
          disabled={isLoading}
          className="btn-primary flex-[2] py-2.5 text-sm font-semibold gap-2"
          style={{ boxShadow: '0 0 20px rgba(79,70,229,0.35)' }}
        >
          {isLoading ? (
            <><i className="fas fa-spinner fa-spin" /> Checking account…</>
          ) : (
            <><i className="fas fa-arrow-right" /> Looks good — Find Videos</>
          )}
        </button>
      </div>
    </div>
  );
}

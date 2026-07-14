import { useState } from 'react';

interface Props {
  topic: string;
  durationHours: number;
  isLoading: boolean;
  onTopicChange: (t: string) => void;
  onDurationChange: (h: number) => void;
  onSubmit: () => void;
}

// Preset duration options
const DURATION_PRESETS = [
  { label: '1 hr',    hours: 1,   icon: 'fa-bolt' },
  { label: '3 hrs',   hours: 3,   icon: 'fa-clock' },
  { label: '5 hrs',   hours: 5,   icon: 'fa-clock' },
  { label: '10 hrs',  hours: 10,  icon: 'fa-graduation-cap' },
  { label: '20 hrs',  hours: 20,  icon: 'fa-book-open' },
  { label: '40 hrs',  hours: 40,  icon: 'fa-trophy' },
];

// Suggested topics for quick-fill
const SUGGESTED_TOPICS = [
  'React & TypeScript',
  'System Design',
  'Python for Data Science',
  'Machine Learning',
  'DSA for Interviews',
  'Node.js & Express',
];

export default function TopicDurationForm({
  topic,
  durationHours,
  isLoading,
  onTopicChange,
  onDurationChange,
  onSubmit,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const isPreset = DURATION_PRESETS.some((p) => p.hours === durationHours);
  const canSubmit = !isLoading && topic.trim().length > 2 && durationHours > 0;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) onSubmit();
  };

  const handleCustomSubmit = () => {
    const val = parseFloat(customHours);
    if (!isNaN(val) && val >= 0.5 && val <= 200) {
      onDurationChange(val);
      setShowCustom(false);
    }
  };

  const formatDuration = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h === 1) return '1 hour';
    if (h < 24) return `${h} hours`;
    const days = Math.round(h / 8); // ~8h/day study
    return `${h} hours (~${days} study days)`;
  };

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Hero header ───────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 0 32px rgba(79,70,229,0.4)',
          }}
        >
          <i className="fas fa-clapperboard text-white text-2xl" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          AI Playlist Generator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Enter a topic and choose your study duration — we'll build a structured
          YouTube learning playlist tailored for you.
        </p>
      </div>

      {/* ── Form card ─────────────────────────────────────────────────── */}
      <div className="card space-y-6">

        {/* Topic input */}
        <div className="space-y-3">
          <label
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <i className="fas fa-lightbulb" style={{ color: 'var(--accent)' }} />
            What do you want to learn?
          </label>

          <div style={{ position: 'relative' }}>
            <input
              id="input-playlist-topic"
              type="text"
              placeholder="e.g. React, System Design, Python, Machine Learning…"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKey}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: `2px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
                boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
                transition: 'all 0.2s',
                paddingRight: '2.5rem',
              }}
            />
            {topic && (
              <button
                onClick={() => onTopicChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                tabIndex={-1}
              >
                <i className="fas fa-times-circle" />
              </button>
            )}
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((s) => (
              <button
                key={s}
                onClick={() => onTopicChange(s)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: topic === s ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: topic === s ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${topic === s ? 'var(--accent)' : 'var(--border)'}`,
                  transform: 'none',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Duration picker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <i className="fas fa-clock" style={{ color: 'var(--accent)' }} />
              Target Study Duration
            </label>
            {durationHours > 0 && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(79,70,229,0.15)', color: 'var(--accent)' }}
              >
                {formatDuration(durationHours)}
              </span>
            )}
          </div>

          {/* Preset chips */}
          <div className="grid grid-cols-3 gap-2">
            {DURATION_PRESETS.map((p) => {
              const active = durationHours === p.hours;
              return (
                <button
                  key={p.hours}
                  onClick={() => { onDurationChange(p.hours); setShowCustom(false); }}
                  className="flex flex-col items-center justify-center py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                      : 'var(--bg-elevated)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: `2px solid ${active ? 'transparent' : 'var(--border)'}`,
                    boxShadow: active ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
                    transform: active ? 'translateY(-1px)' : 'none',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <i className={`fas ${p.icon} mb-1`} style={{ fontSize: '0.85rem' }} />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom duration row */}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
              style={{
                background: !isPreset && durationHours > 0 ? 'rgba(79,70,229,0.1)' : 'var(--bg-elevated)',
                border: `1px dashed ${!isPreset && durationHours > 0 ? 'var(--accent)' : 'var(--border)'}`,
                color: !isPreset && durationHours > 0 ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <i className="fas fa-sliders" />
              {!isPreset && durationHours > 0
                ? `Custom: ${formatDuration(durationHours)} — click to change`
                : 'Set custom duration'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max="200"
                step="0.5"
                placeholder="Hours (e.g. 7.5)"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); }}
                autoFocus
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '2px solid var(--accent)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleCustomSubmit}
                className="btn-primary px-4 py-2 text-sm"
              >
                Set
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-2 text-sm rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          id="btn-generate-roadmap"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full py-3.5 text-base font-semibold gap-2"
          style={{
            boxShadow: canSubmit ? '0 0 24px rgba(79,70,229,0.4)' : 'none',
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin" />
              Generating roadmap…
            </>
          ) : (
            <>
              <i className="fas fa-wand-magic-sparkles" />
              Generate Learning Roadmap
            </>
          )}
        </button>
      </div>

      {/* Footer hints */}
      <div className="flex flex-col gap-1.5 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-route mr-1" style={{ color: 'var(--accent)' }} />
          A structured roadmap is generated first — review it before we search YouTube.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-youtube mr-1" style={{ color: '#ff0000' }} />
          Videos are ranked by quality and matched to your total duration target.
        </p>
      </div>
    </div>
  );
}

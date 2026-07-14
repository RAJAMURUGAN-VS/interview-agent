import { useState } from 'react';

interface Props {
  topic: string;
  playlistUrl: string;
  targetDurationMinutes: number;
  actualDurationMinutes?: number;
  videoCount: number;
  onReset: () => void;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function durationDeltaLabel(target: number, actual: number): { label: string; color: string } {
  if (!actual) return { label: '', color: 'var(--text-muted)' };
  const pct = Math.round(((actual - target) / target) * 100);
  if (Math.abs(pct) <= 5) return { label: 'On target', color: 'var(--success)' };
  if (pct > 0) return { label: `+${pct}% over`, color: '#f59e0b' };
  return { label: `${pct}% under`, color: '#f59e0b' };
}

export default function PlaylistResultCard({
  topic,
  playlistUrl,
  targetDurationMinutes,
  actualDurationMinutes,
  videoCount,
  onReset,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(playlistUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: just open the URL
      window.open(playlistUrl, '_blank');
    }
  };

  const { label: deltaLabel, color: deltaColor } = durationDeltaLabel(
    targetDurationMinutes,
    actualDurationMinutes ?? 0,
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Success banner */}
      <div
        className="card text-center space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(79,70,229,0.08) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #4f46e5 100%)',
            boxShadow: '0 0 32px rgba(34,197,94,0.35)',
          }}
        >
          <i className="fas fa-check text-white text-2xl" />
        </div>

        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Playlist Created!
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Your <strong style={{ color: 'var(--text-primary)' }}>{topic}</strong> learning
            playlist is live on YouTube.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {videoCount}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>videos</p>
          </div>
          <div className="w-px" style={{ background: 'var(--border)' }} />
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {actualDurationMinutes ? formatMinutes(actualDurationMinutes) : '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              actual &middot;{' '}
              <span style={{ color: deltaColor }}>{deltaLabel}</span>
            </p>
          </div>
          <div className="w-px" style={{ background: 'var(--border)' }} />
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-secondary)' }}>
              {formatMinutes(targetDurationMinutes)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>target</p>
          </div>
        </div>
      </div>

      {/* Playlist URL */}
      <div className="card space-y-3">
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          <i className="fab fa-youtube mr-1.5" style={{ color: '#ff0000' }} />
          Your playlist URL
        </p>

        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <span
            className="flex-1 text-xs truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {playlistUrl}
          </span>
          <button
            id="btn-copy-playlist-url"
            onClick={handleCopy}
            title="Copy URL"
            className="text-xs px-2 py-1 rounded transition-all duration-150 flex-shrink-0"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(79,70,229,0.15)',
              color: copied ? 'var(--success)' : 'var(--accent)',
            }}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1`} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Open button */}
        <a
          id="btn-open-playlist"
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full py-3 text-base font-semibold gap-2 flex items-center justify-center"
          style={{ boxShadow: '0 0 24px rgba(79,70,229,0.35)', textDecoration: 'none' }}
        >
          <i className="fab fa-youtube" />
          Open Playlist on YouTube
          <i className="fas fa-external-link-alt text-xs" />
        </a>
      </div>

      {/* Make another */}
      <div className="text-center">
        <button
          id="btn-make-another-playlist"
          onClick={onReset}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <i className="fas fa-plus mr-1.5" />
          Make another playlist
        </button>
      </div>
    </div>
  );
}

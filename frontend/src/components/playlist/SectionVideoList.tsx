import type { RoadmapSection, SelectedVideo } from '../../types';

interface Props {
  roadmap: RoadmapSection[];
  selectedVideos: SelectedVideo[];
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

export default function SectionVideoList({ roadmap, selectedVideos }: Props) {
  if (!selectedVideos?.length) return null;

  // Group videos by sectionId for fast lookup
  const bySection = new Map<string, SelectedVideo[]>();
  for (const v of selectedVideos) {
    const arr = bySection.get(v.sectionId) ?? [];
    arr.push(v);
    bySection.set(v.sectionId, arr);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        <i className="fas fa-film mr-2" style={{ color: 'var(--accent)' }} />
        Selected videos ({selectedVideos.length} total)
      </h3>

      <div className="space-y-3">
        {roadmap.map((section, idx) => {
          const videos = bySection.get(section.id) ?? [];
          return (
            <div
              key={section.id}
              className="card animate-fade-in"
              style={{
                animationDelay: `${idx * 60}ms`,
                padding: '14px 16px',
              }}
            >
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(79,70,229,0.2)', color: 'var(--accent)' }}
                >
                  {section.order}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </span>
              </div>

              {/* Video(s) */}
              {videos.length === 0 ? (
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  No video found for this section
                </p>
              ) : (
                <div className="space-y-2">
                  {videos.map((video) => (
                    <a
                      key={video.videoId}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-lg p-2 transition-all duration-150 group"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 rounded overflow-hidden" style={{ width: 88, height: 52 }}>
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'var(--border)' }}
                          >
                            <i className="fab fa-youtube text-lg" style={{ color: '#ff0000' }} />
                          </div>
                        )}
                        {/* Duration badge */}
                        <span
                          className="absolute bottom-0.5 right-0.5 text-xs px-1 rounded"
                          style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.6rem' }}
                        >
                          {formatDuration(video.durationSeconds)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium leading-tight line-clamp-2 group-hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {video.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {video.channelTitle} &middot; {formatViews(video.viewCount)}
                        </p>
                      </div>

                      <i
                        className="fas fa-external-link-alt text-xs flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

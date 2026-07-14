import type { VideoResult } from '../../types';

interface Props {
  video: VideoResult;
}

export default function VideoResourceCard({ video }: Props) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden transition-all hover:shadow-md"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        textDecoration: 'none',
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-full aspect-video flex items-center justify-center text-center p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(124,58,237,0.1) 100%)',
        }}
      >
        <div>
          <i
            className="fas fa-play-circle text-3xl mb-2"
            style={{ color: 'var(--accent)' }}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            YouTube Video
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="font-medium text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {video.title}
        </p>
        {video.channel && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <i className="fas fa-user-circle mr-1" />
            {video.channel}
          </p>
        )}
        <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
          "{video.reason}"
        </p>
      </div>

      {/* Open indicator */}
      <div
        className="px-3 py-2 flex items-center justify-center gap-1 text-xs font-medium"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--accent)',
        }}
      >
        <i className="fas fa-external-link-alt" />
        Watch on YouTube
      </div>
    </a>
  );
}

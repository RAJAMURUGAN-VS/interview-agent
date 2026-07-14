import type { ResourceLink } from '../../types';

interface Props {
  title: string;
  icon: string;
  items: ResourceLink[];
  emptyMessage?: string;
}

export default function ResourceSection({
  title,
  icon,
  items,
  emptyMessage = 'No resources found',
}: Props) {
  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-semibold flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <i className={`fas ${icon}`} style={{ color: 'var(--accent)' }} />
        {title}
      </h3>

      {items.length === 0 ? (
        <div
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
          }}
        >
          <i className="fas fa-info-circle mr-1.5" />
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 rounded-lg transition-all hover:translate-x-1"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.source && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {item.source}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <i
                  className="fas fa-external-link-alt flex-shrink-0 mt-1 text-xs"
                  style={{ color: 'var(--accent)' }}
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

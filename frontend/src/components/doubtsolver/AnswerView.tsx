import type { DoubtSolverResult } from '../../types';
import ResourceSection from './ResourceSection';
import VideoResourceCard from './VideoResourceCard';

interface Props {
  result: DoubtSolverResult;
  isLoading: boolean;
  onReset: () => void;
}

/**
 * Render markdown-like content with proper formatting:
 * - ## Header → <h3>
 * - **bold** → <strong>
 * - 1. numbered list
 * - - bullet list
 */
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inBulletList = false;
  let inNumberedList = false;
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];

  const flushBulletList = () => {
    if (inBulletList && bulletItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="list-disc list-inside mb-4 space-y-2 ml-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {bulletItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      bulletItems = [];
      inBulletList = false;
    }
  };

  const flushNumberedList = () => {
    if (inNumberedList && numberedItems.length > 0) {
      elements.push(
        <ol
          key={`olist-${elements.length}`}
          className="list-decimal list-inside mb-4 space-y-2 ml-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {numberedItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      numberedItems = [];
      inNumberedList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line — flush current lists
      flushBulletList();
      flushNumberedList();
      elements.push(<div key={`empty-${elements.length}`} className="h-3" />);
      continue;
    }

    // Header (## ...)
    if (line.startsWith('##')) {
      flushBulletList();
      flushNumberedList();
      const headerText = line.replace(/^##\s*/, '').trim();
      elements.push(
        <h3
          key={`header-${elements.length}`}
          className="text-base font-bold mt-5 mb-3"
          style={{ color: 'var(--accent)' }}
        >
          {renderInline(headerText)}
        </h3>
      );
      continue;
    }

    // Numbered list (1. 2. 3. ...)
    if (/^\d+\.\s/.test(line)) {
      flushBulletList();
      inNumberedList = true;
      const itemText = line.replace(/^\d+\.\s*/, '').trim();
      numberedItems.push(itemText);
      continue;
    }

    // Bullet point (- ...)
    if (line.startsWith('-') && !line.startsWith('--')) {
      flushNumberedList();
      inBulletList = true;
      const bulletText = line.replace(/^-\s*/, '').trim();
      bulletItems.push(bulletText);
      continue;
    }

    // Regular paragraph
    flushBulletList();
    flushNumberedList();

    elements.push(
      <p
        key={`para-${elements.length}`}
        className="mb-4 leading-relaxed text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {renderInline(line)}
      </p>
    );
  }

  // Flush any remaining lists
  flushBulletList();
  flushNumberedList();

  return <>{elements}</>;
}

/**
 * Render inline markdown: **bold**
 * Remove citation numbers like [1], [2], etc.
 */
function renderInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  // Regex for **bold** and [n] citation numbers (which we'll remove)
  const regex = /\*\*(.+?)\*\*|\[\d+\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    if (match[0].startsWith('**')) {
      // Bold text
      result.push(
        <strong key={result.length} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {match[1]}
        </strong>
      );
    }
    // Skip citation numbers completely — don't render them

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

export default function AnswerView({ result, isLoading, onReset }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Skeleton loaders */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-4 rounded-lg animate-pulse"
              style={{ background: 'var(--bg-secondary)' }}
            />
            <div
              className="h-3 w-3/4 rounded-lg animate-pulse"
              style={{ background: 'var(--bg-secondary)' }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Explanation */}
      <div className="space-y-3">
        <h2
          className="text-lg font-bold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <i className="fas fa-lightbulb" style={{ color: 'var(--accent)' }} />
          Explanation
        </h2>
        <div
          className="card p-6 rounded-lg"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <MarkdownContent text={result.explanation} />
        </div>
      </div>

      {/* YouTube Videos */}
      {result.youtubeVideos.length > 0 && (
        <div className="space-y-3">
          <h3
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <i className="fas fa-youtube" style={{ color: '#ff0000' }} />
            Best YouTube Videos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.youtubeVideos.slice(0, 3).map((video, i) => (
              <VideoResourceCard key={i} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Documentation */}
      {result.documentation.length > 0 && (
        <ResourceSection
          title="Official Documentation"
          icon="fa-book"
          items={result.documentation}
        />
      )}

      {/* Practice Resources */}
      {result.practiceResources.length > 0 && (
        <ResourceSection
          title="Practice Resources"
          icon="fa-dumbbell"
          items={result.practiceResources}
        />
      )}

      {/* GitHub Examples */}
      {result.githubExamples.length > 0 && (
        <ResourceSection
          title="GitHub Examples"
          icon="fa-github"
          items={result.githubExamples}
        />
      )}

      {/* Ask another button */}
      <button
        onClick={onReset}
        className="w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <i className="fas fa-arrow-left mr-2" />
        Ask Another Question
      </button>
    </div>
  );
}

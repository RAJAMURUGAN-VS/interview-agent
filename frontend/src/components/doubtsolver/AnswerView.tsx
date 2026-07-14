import type { DoubtSolverResult } from '../../types';
import ResourceSection from './ResourceSection';
import VideoResourceCard from './VideoResourceCard';

interface Props {
  result: DoubtSolverResult;
  isLoading: boolean;
  onReset: () => void;
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
      <div className="space-y-2">
        <h2
          className="text-lg font-bold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <i className="fas fa-lightbulb" style={{ color: 'var(--accent)' }} />
          Answer
        </h2>
        <div
          className="card p-4 leading-relaxed text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {result.explanation}
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
        className="w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
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

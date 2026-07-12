import { useState } from 'react';
import type { InterviewExperiencePost, InsightsPostType } from '../../types';

interface ExperienceCardProps {
  post: InterviewExperiencePost;
  onUpvote: (type: InsightsPostType, id: string) => void;
  onReport: (type: InsightsPostType, id: string) => void;
}

const DIFFICULTY_STARS = (n: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <i
      key={i}
      className={`fas fa-star text-[10px] ${i < n ? 'text-[#f59e0b]' : 'text-[#2a2a3d]'}`}
    />
  ));

const OUTCOME_STYLE: Record<string, string> = {
  Selected: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20',
  Rejected:  'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20',
  Waiting:   'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
};

const OUTCOME_ICON: Record<string, string> = {
  Selected: 'fas fa-circle-check',
  Rejected: 'fas fa-circle-xmark',
  Waiting:  'fas fa-clock',
};

export default function ExperienceCard({ post, onUpvote, onReport }: ExperienceCardProps) {
  const [expanded, setExpanded]   = useState(false);
  const [upvoted, setUpvoted]     = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);

  const handleUpvote = () => {
    if (upvoted) return;
    setUpvoted(true);
    setLocalUpvotes((n) => n + 1);
    onUpvote('experience', post.id);
  };

  const dateStr = new Date(post.postedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[#f0f0ff] font-semibold text-sm">{post.role}</h3>
          <p className="text-xs text-[#8b8ba8] mt-0.5">
            {post.department} · {post.offerType} · {post.authorAlias}
          </p>
        </div>

        {/* Outcome badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border
          flex items-center gap-1.5 flex-shrink-0
          ${OUTCOME_STYLE[post.outcome] ?? 'bg-[#2a2a3d] text-[#8b8ba8] border-[#2a2a3d]'}`}>
          <i className={`${OUTCOME_ICON[post.outcome] ?? 'fas fa-circle'} text-[10px]`} />
          {post.outcome}
        </span>
      </div>

      {/* Stars + date */}
      <div className="flex items-center gap-3 mt-2.5">
        <div className="flex gap-0.5">{DIFFICULTY_STARS(post.difficulty)}</div>
        <span className="text-xs text-[#8b8ba8]">Difficulty {post.difficulty}/5</span>
        <span className="text-xs text-[#4a4a6a] ml-auto">{dateStr}</span>
      </div>

      {/* Rounds */}
      <div className="mt-4 space-y-3">
        {(expanded ? post.rounds : post.rounds.slice(0, 2)).map((round, i) => (
          <div key={i} className="bg-[#0a0a0f] rounded-xl p-3 border border-[#2a2a3d]">
            <p className="text-xs font-semibold text-[#4f46e5] mb-1">
              <i className="fas fa-layer-group mr-1.5" />
              {round.roundName || `Round ${i + 1}`}
            </p>
            <p className="text-xs text-[#c0c0d8] leading-relaxed">{round.description}</p>
          </div>
        ))}

        {post.rounds.length > 2 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-[#4f46e5] hover:text-[#818cf8] transition-colors"
          >
            {expanded
              ? 'Show less'
              : `+${post.rounds.length - 2} more round${post.rounds.length - 2 > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Tips */}
      {post.tips && (
        <div className="mt-3 bg-[#4f46e5]/5 border border-[#4f46e5]/15 rounded-xl p-3">
          <p className="text-xs text-[#8b8ba8] font-medium mb-1">
            <i className="fas fa-lightbulb mr-1.5 text-[#4f46e5]" />Tips
          </p>
          <p className="text-xs text-[#c0c0d8] leading-relaxed">{post.tips}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#2a2a3d]">
        <button
          onClick={handleUpvote}
          disabled={upvoted}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
            border transition-all duration-200
            ${upvoted
              ? 'border-[#4f46e5]/40 text-[#4f46e5] bg-[#4f46e5]/10 cursor-default'
              : 'border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5]/40 hover:text-[#4f46e5]'
            }`}
        >
          <i className={`fa${upvoted ? 's' : 'r'} fa-thumbs-up`} />
          {localUpvotes}
        </button>

        <button
          onClick={() => onReport('experience', post.id)}
          className="ml-auto text-xs text-[#4a4a6a] hover:text-[#ef4444]
            transition-colors flex items-center gap-1"
          title="Report this post"
        >
          <i className="fas fa-flag text-[10px]" />
          Report
        </button>
      </div>
    </div>
  );
}

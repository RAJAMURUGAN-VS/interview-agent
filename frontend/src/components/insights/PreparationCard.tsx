import { useState } from 'react';
import type { PreparationStrategyPost, InsightsPostType } from '../../types';

interface PreparationCardProps {
  post: PreparationStrategyPost;
  onUpvote: (type: InsightsPostType, id: string) => void;
  onReport: (type: InsightsPostType, id: string) => void;
}

const TAG_COLORS = [
  'bg-[#4f46e5]/10 text-[#818cf8] border-[#4f46e5]/20',
  'bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20',
  'bg-[#22c55e]/10 text-[#86efac] border-[#22c55e]/20',
];

function TagList({ label, icon, items, colorIdx }: {
  label: string; icon: string; items: string[]; colorIdx: number;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-[#8b8ba8] mb-1.5">
        <i className={`${icon} mr-1.5`} />{label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={`text-xs px-2.5 py-0.5 rounded-lg border ${TAG_COLORS[colorIdx]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PreparationCard({ post, onUpvote, onReport }: PreparationCardProps) {
  const [upvoted, setUpvoted]           = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);

  const handleUpvote = () => {
    if (upvoted) return;
    setUpvoted(true);
    setLocalUpvotes((n) => n + 1);
    onUpvote('preparation', post.id);
  };

  const dateStr = new Date(post.postedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[#f0f0ff] font-semibold text-sm">{post.role}</h3>
          <p className="text-xs text-[#8b8ba8] mt-0.5">
            {post.department} · {post.authorAlias}
          </p>
        </div>
        <span className="text-xs font-semibold bg-[#0ea5e9]/10 text-[#38bdf8]
          border border-[#0ea5e9]/20 rounded-lg px-2.5 py-1 flex-shrink-0">
          <i className="fas fa-calendar-days mr-1.5" />
          {post.prepDurationWeeks}w prep
        </span>
      </div>

      <p className="text-xs text-[#4a4a6a] mt-1">{dateStr}</p>

      {/* Tag sections */}
      <div className="mt-4 space-y-3">
        <TagList label="Coding Platforms" icon="fas fa-code"        items={post.codingPlatforms}  colorIdx={0} />
        <TagList label="Study Materials"  icon="fas fa-book"        items={post.studyMaterials}   colorIdx={1} />
        <TagList label="YouTube Channels" icon="fab fa-youtube"     items={post.youtubeChannels}  colorIdx={2} />
      </div>

      {/* Daily routine */}
      {post.dailyRoutine && (
        <div className="mt-3 bg-[#0a0a0f] rounded-xl p-3 border border-[#2a2a3d]">
          <p className="text-xs font-medium text-[#8b8ba8] mb-1">
            <i className="fas fa-clock mr-1.5 text-[#0ea5e9]" />Daily Routine
          </p>
          <p className="text-xs text-[#c0c0d8] leading-relaxed">{post.dailyRoutine}</p>
        </div>
      )}

      {/* Advice */}
      <div className="mt-3 bg-[#4f46e5]/5 border border-[#4f46e5]/15 rounded-xl p-3">
        <p className="text-xs font-medium text-[#8b8ba8] mb-1">
          <i className="fas fa-lightbulb mr-1.5 text-[#4f46e5]" />Advice
        </p>
        <p className="text-xs text-[#c0c0d8] leading-relaxed">{post.advice}</p>
      </div>

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
          onClick={() => onReport('preparation', post.id)}
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

import type { CompanySummary } from '../../types';

interface CompanyCardProps {
  company: CompanySummary;
  onClick: (name: string) => void;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Very Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very Hard',
};

const DIFFICULTY_COLOR: Record<number, string> = {
  1: 'text-[#22c55e]',
  2: 'text-[#86efac]',
  3: 'text-[#f59e0b]',
  4: 'text-[#f97316]',
  5: 'text-[#ef4444]',
};

export default function CompanyCard({ company: c, onClick }: CompanyCardProps) {
  const letter = c.company.charAt(0).toUpperCase();
  const diff   = c.avgDifficulty ? Math.round(c.avgDifficulty) : null;

  return (
    <button
      onClick={() => onClick(c.company)}
      className="card w-full text-left group hover:border-[#4f46e5]/50
        hover:shadow-[0_0_20px_rgba(79,70,229,0.08)] transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/15 border border-[#4f46e5]/30
          flex items-center justify-center flex-shrink-0
          group-hover:bg-[#4f46e5]/25 transition-colors">
          <span className="text-[#4f46e5] font-bold text-sm">{letter}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[#f0f0ff] font-semibold text-sm truncate
            group-hover:text-white transition-colors">
            {c.company}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span className="text-xs text-[#8b8ba8]">
              <i className="fas fa-file-lines mr-1" />
              {c.totalPosts} {c.totalPosts === 1 ? 'post' : 'posts'}
            </span>

            {diff !== null && (
              <span className={`text-xs font-medium ${DIFFICULTY_COLOR[diff] ?? 'text-[#8b8ba8]'}`}>
                <i className="fas fa-gauge-high mr-1" />
                {DIFFICULTY_LABEL[diff] ?? diff}
              </span>
            )}

            {c.selectionRate !== null && (
              <span className="text-xs text-[#22c55e]">
                <i className="fas fa-circle-check mr-1" />
                {c.selectionRate}% selected
              </span>
            )}
          </div>
        </div>

        <i className="fas fa-chevron-right text-xs text-[#4a4a6a]
          group-hover:text-[#4f46e5] transition-colors mt-1 flex-shrink-0" />
      </div>

      {/* Post-type pill row */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#2a2a3d]">
        <span className="text-xs bg-[#4f46e5]/10 text-[#818cf8] rounded-lg px-2 py-0.5">
          <i className="fas fa-comment-dots mr-1" />{c.expCount} experiences
        </span>
        <span className="text-xs bg-[#0ea5e9]/10 text-[#38bdf8] rounded-lg px-2 py-0.5">
          <i className="fas fa-book mr-1" />{c.prepCount} prep tips
        </span>
      </div>
    </button>
  );
}

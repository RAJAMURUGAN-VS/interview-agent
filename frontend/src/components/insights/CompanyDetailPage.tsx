import type { CompanyDetail, InsightsSubTab, InsightsPostType } from '../../types';
import SubTabBar      from './SubTabBar';
import ExperienceCard from './ExperienceCard';
import PreparationCard from './PreparationCard';
import StatsBar       from './StatsBar';
import EmptyState     from './EmptyState';

interface CompanyDetailPageProps {
  detail:      CompanyDetail;
  activeSubTab: InsightsSubTab;
  isLoading:   boolean;
  onSubTabChange: (tab: InsightsSubTab) => void;
  onBack:      () => void;
  onShare:     () => void;
  onUpvote:    (type: InsightsPostType, id: string) => void;
  onReport:    (type: InsightsPostType, id: string) => void;
}

export default function CompanyDetailPage({
  detail,
  activeSubTab,
  isLoading,
  onSubTabChange,
  onBack,
  onShare,
  onUpvote,
  onReport,
}: CompanyDetailPageProps) {
  const stats = [
    {
      icon:  'fas fa-file-lines',
      label: 'Posts',
      value: detail.totalPosts,
    },
    ...(detail.avgDifficulty !== null ? [{
      icon:  'fas fa-gauge-high',
      label: 'Avg Difficulty',
      value: `${detail.avgDifficulty}/5`,
    }] : []),
    ...(detail.selectionRate !== null ? [{
      icon:   'fas fa-circle-check',
      label:  'Selection Rate',
      value:  `${detail.selectionRate}%`,
      accent: true,
    }] : []),
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back + header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl border border-[#2a2a3d] flex items-center
              justify-center text-[#8b8ba8] hover:text-[#f0f0ff]
              hover:border-[#4f46e5]/40 transition-all"
            aria-label="Back to companies"
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/15 border border-[#4f46e5]/30
                flex items-center justify-center">
                <span className="text-[#4f46e5] font-bold text-sm">
                  {detail.company.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#f0f0ff] tracking-tight">
                {detail.company}
              </h2>
            </div>
            <div className="mt-1.5">
              <StatsBar stats={stats} />
            </div>
          </div>
        </div>

        <button
          onClick={onShare}
          className="btn-primary text-sm px-4 py-2 flex-shrink-0"
        >
          <i className="fas fa-plus mr-2" />Share Yours
        </button>
      </div>

      {/* Sub-tab bar */}
      <div className="overflow-x-auto pb-1">
        <SubTabBar
          active={activeSubTab}
          expCount={detail.experiences.length}
          prepCount={detail.preparations.length}
          onChange={onSubTabChange}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-40 bg-[#1a1a2e]" />
          ))}
        </div>
      ) : (
        <div className="animate-fade-in space-y-4">
          {activeSubTab === 'experience' && (
            detail.experiences.length === 0 ? (
              <EmptyState
                icon="fas fa-comment-dots"
                title="No interview experiences yet"
                subtitle="Be the first to share what the interview was like."
                action={
                  <button onClick={onShare} className="btn-primary text-sm px-4 py-2">
                    <i className="fas fa-plus mr-2" />Share Yours
                  </button>
                }
              />
            ) : (
              detail.experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  post={exp}
                  onUpvote={onUpvote}
                  onReport={onReport}
                />
              ))
            )
          )}

          {activeSubTab === 'preparation' && (
            detail.preparations.length === 0 ? (
              <EmptyState
                icon="fas fa-book-open"
                title="No prep strategies yet"
                subtitle="Help juniors by sharing how you prepared for this company."
                action={
                  <button onClick={onShare} className="btn-primary text-sm px-4 py-2">
                    <i className="fas fa-plus mr-2" />Share Yours
                  </button>
                }
              />
            ) : (
              detail.preparations.map((prep) => (
                <PreparationCard
                  key={prep.id}
                  post={prep}
                  onUpvote={onUpvote}
                  onReport={onReport}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

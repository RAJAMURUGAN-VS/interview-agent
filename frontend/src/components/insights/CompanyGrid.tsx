import type { CompanySummary } from '../../types';
import CompanyCard from './CompanyCard';
import EmptyState from './EmptyState';

interface CompanyGridProps {
  companies: CompanySummary[];
  searchQuery: string;
  isLoading: boolean;
  onSelect: (name: string) => void;
  onShareFirst: () => void;
}

export default function CompanyGrid({
  companies,
  searchQuery,
  isLoading,
  onSelect,
  onShareFirst,
}: CompanyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card animate-pulse h-24 bg-[#1a1a2e]"
          />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon="fas fa-magnifying-glass"
          title={`No results for "${searchQuery}"`}
          subtitle="Be the first to share your experience with this company."
          action={
            <button
              onClick={onShareFirst}
              className="btn-primary text-sm px-4 py-2"
            >
              <i className="fas fa-plus mr-2" />
              Share Your Experience
            </button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon="fas fa-lightbulb"
        title="No insights yet"
        subtitle="Be the first senior to share your placement experience with juniors."
        action={
          <button
            onClick={onShareFirst}
            className="btn-primary text-sm px-4 py-2"
          >
            <i className="fas fa-plus mr-2" />
            Share Your Experience
          </button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {companies.map((c) => (
        <CompanyCard key={c.company} company={c} onClick={onSelect} />
      ))}
    </div>
  );
}

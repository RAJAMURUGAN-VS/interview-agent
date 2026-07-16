import type { PrepPlan, PrepDay, PrepConfidence, PrepDayScore } from '../../types';
import DayCard          from './DayCard';
import TopicCard        from './TopicCard';
import ReviewDayBanner  from './ReviewDayBanner';
import ConfidenceBanner from './ConfidenceBanner';

interface PlanTimelineProps {
  plan:             PrepPlan;
  activeDayIndex:   number;
  dayScores:        Record<number, number>;   // dayNumber → percentage
  onSelectDay:      (idx: number) => void;
  onReset:          () => void;
  onAssessmentComplete: (result: Omit<PrepDayScore, 'completedAt'>) => void;
  confidence:       PrepConfidence | null;
}

const TIER_COLOR: Record<string, string> = {
  'Easy':        'text-[#22c55e]',
  'Easy-Medium': 'text-[#86efac]',
  'Medium':      'text-[#f59e0b]',
  'Medium-High': 'text-[#f97316]',
  'High':        'text-[#ef4444]',
};

export default function PlanTimeline({
  plan, activeDayIndex, dayScores, onSelectDay,
  onReset, onAssessmentComplete, confidence,
}: PlanTimelineProps) {
  const { company, timeline } = plan;
  const activeDay: PrepDay    = timeline[activeDayIndex];
  const tierColor             = TIER_COLOR[company.difficultyTier] ?? 'text-[#8b8ba8]';
  const reviewDays            = timeline.filter(d => d.isReview).length;
  const contentDays           = timeline.length - reviewDays;
  const completedDays         = Object.keys(dayScores).length;

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Company header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/15 border border-[#4f46e5]/30
              flex items-center justify-center">
              <span className="text-[#4f46e5] font-bold text-sm">
                {company.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#f0f0ff] tracking-tight">
              {company.displayName}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[#8b8ba8]">
            <span><i className="fas fa-calendar-days mr-1" />{plan.days} days</span>
            <span><i className="fas fa-list-check mr-1" />{contentDays} topics</span>
            {reviewDays > 0 && (
              <span><i className="fas fa-rotate mr-1" />{reviewDays} review</span>
            )}
            <span className={`font-medium ${tierColor}`}>
              <i className="fas fa-gauge-high mr-1" />{company.difficultyTier}
            </span>
            {company.testsAptitude && (
              <span className="text-[#f59e0b]">
                <i className="fas fa-brain mr-1" />Aptitude included
              </span>
            )}
            {completedDays > 0 && (
              <span className="text-[#4f46e5]">
                <i className="fas fa-circle-check mr-1" />{completedDays} assessed
              </span>
            )}
          </div>
        </div>

        <button onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-[#8b8ba8]
            hover:text-[#f0f0ff] border border-[#2a2a3d] hover:border-[#4f46e5]/40
            rounded-xl px-3 py-2 transition-all">
          <i className="fas fa-arrow-left text-[10px]" />New Plan
        </button>
      </div>

      {/* Confidence banner */}
      {confidence === 'low' && (
        <ConfidenceBanner
          confidence={company.confidence as PrepConfidence}
          company={company.displayName}
          sourceCount={company.sourceCount}
        />
      )}

      {/* Format notes */}
      {company.formatNotes && (
        <div className="flex items-start gap-2 text-xs text-[#8b8ba8]
          bg-[#1c1c27] border border-[#2a2a3d] rounded-xl px-4 py-3">
          <i className="fas fa-circle-info text-[#4f46e5] mt-0.5 flex-shrink-0" />
          <span>{company.formatNotes}</span>
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">

        {/* Day list sidebar */}
        <div className="lg:sticky lg:top-4 space-y-1.5 max-h-[70vh]
          overflow-y-auto pr-1">
          {timeline.map((day, idx) => (
            <DayCard
              key={day.dayNumber}
              day={day}
              isActive={idx === activeDayIndex}
              score={dayScores[day.dayNumber] ?? null}
              onClick={() => onSelectDay(idx)}
            />
          ))}
        </div>

        {/* Active day detail */}
        <div className="card animate-fade-in" key={activeDayIndex}>
          {activeDay.isReview
            ? <ReviewDayBanner dayNumber={activeDay.dayNumber} />
            : (
              <TopicCard
                day={activeDay}
                company={company.displayName}
                onComplete={onAssessmentComplete}
              />
            )
          }
        </div>

      </div>
    </div>
  );
}

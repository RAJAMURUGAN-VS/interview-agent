import { usePrepPlan }          from '../../hooks/usePrepPlan';
import { ErrorBoundary }         from '../ui/ErrorBoundary';
import CompanyInput              from './CompanyInput';
import TimelineInput             from './TimelineInput';
import DiscoveryLoadingState     from './DiscoveryLoadingState';
import PlanTimeline              from './PlanTimeline';

export default function PrepPlanPage() {
  const pp = usePrepPlan();

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12">

      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-1">
          Smart Prep
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">
          Prep Timeline
        </h1>
        <p className="text-sm text-[#8b8ba8] mt-1">
          Enter any company name and how many days you have — get a
          day-by-day schedule built around what that company actually tests.
        </p>
      </div>

      <ErrorBoundary>

        {/* ── SETUP ────────────────────────────────────────────────────── */}
        {pp.phase === 'setup' && (
          <div className="card space-y-6 max-w-xl">
            <CompanyInput
              value={pp.companyInput}
              onChange={pp.setCompanyInput}
              suggestions={pp.filteredSuggestions}
              showSuggestions={pp.showSuggestions}
              onShowSuggestions={pp.setShowSuggestions}
              onSelect={(name) => { pp.setCompanyInput(name); pp.setShowSuggestions(false); }}
              disabled={false}
            />

            <TimelineInput
              days={pp.days}
              onChange={pp.setDays}
              disabled={false}
            />

            <button
              onClick={pp.handleGenerate}
              disabled={!pp.companyInput.trim()}
              className="btn-primary w-full py-3 disabled:opacity-40
                disabled:cursor-not-allowed"
            >
              <i className="fas fa-calendar-plus mr-2" />
              Build My Prep Plan
            </button>
          </div>
        )}

        {/* ── DISCOVERING / BUILDING ─────────────────────────────────── */}
        {(pp.phase === 'discovering' || pp.phase === 'building') && (
          <DiscoveryLoadingState
            phase={pp.phase}
            company={pp.companyInput}
            message={pp.loadingMsg}
            isCached={pp.isCached}
          />
        )}

        {/* ── PLAN ─────────────────────────────────────────────────────── */}
        {pp.phase === 'plan' && pp.plan && (
          <PlanTimeline
            plan={pp.plan}
            activeDayIndex={pp.activeDayIndex}
            onSelectDay={pp.setActiveDayIndex}
            onReset={pp.handleReset}
            confidence={pp.companyConfidence}
          />
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {pp.phase === 'error' && (
          <div className="card border-[#ef4444]/20 bg-[#ef4444]/5 space-y-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-circle-exclamation text-[#ef4444] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#f0f0ff]">
                  Could not generate plan
                </p>
                <p className="text-xs text-[#8b8ba8] mt-1">{pp.error}</p>
              </div>
            </div>
            <button
              onClick={pp.handleReset}
              className="btn-primary text-sm px-4 py-2"
            >
              <i className="fas fa-arrow-left mr-2" />Try Again
            </button>
          </div>
        )}

      </ErrorBoundary>
    </div>
  );
}

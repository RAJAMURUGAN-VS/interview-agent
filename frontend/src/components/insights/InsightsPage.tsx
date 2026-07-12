import { useInsights }       from '../../hooks/useInsights';
import { ErrorBoundary }     from '../ui/ErrorBoundary';
import CompanySearchBar      from './CompanySearchBar';
import CompanyGrid           from './CompanyGrid';
import CompanyDetailPage     from './CompanyDetailPage';
import ShareModal            from './ShareModal';

export default function InsightsPage() {
  const ins = useInsights();

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12">

      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-1">
          Community
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">
              Senior Insights
            </h1>
            <p className="text-sm text-[#8b8ba8] mt-1">
              Real experiences and prep strategies from seniors who've been through it.
            </p>
          </div>
          {ins.view === 'browse' && (
            <button
              onClick={() => ins.openModal()}
              className="btn-primary text-sm px-4 py-2 flex-shrink-0"
            >
              <i className="fas fa-plus mr-2" />Share Yours
            </button>
          )}
        </div>
      </div>

      <ErrorBoundary>

        {/* ── BROWSE VIEW ─────────────────────────────────────────────────── */}
        {ins.view === 'browse' && (
          <div className="space-y-5">
            <CompanySearchBar
              value={ins.searchQuery}
              onChange={ins.setSearchQuery}
            />

            {ins.error ? (
              <div className="card border-[#ef4444]/20 bg-[#ef4444]/5">
                <p className="text-sm text-[#ef4444]">
                  <i className="fas fa-circle-exclamation mr-2" />{ins.error}
                </p>
              </div>
            ) : (
              <CompanyGrid
                companies={ins.filteredCompanies}
                searchQuery={ins.searchQuery}
                isLoading={ins.isLoading}
                onSelect={ins.openCompany}
                onShareFirst={() => ins.openModal()}
              />
            )}
          </div>
        )}

        {/* ── COMPANY DETAIL VIEW ──────────────────────────────────────────── */}
        {ins.view === 'company-detail' && (
          <>
            {ins.error && !ins.companyDetail ? (
              <div className="card border-[#ef4444]/20 bg-[#ef4444]/5">
                <p className="text-sm text-[#ef4444]">
                  <i className="fas fa-circle-exclamation mr-2" />{ins.error}
                </p>
                <button
                  onClick={ins.backToBrowse}
                  className="text-xs text-[#8b8ba8] hover:text-[#f0f0ff] mt-3
                    flex items-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-arrow-left text-[10px]" />Back to companies
                </button>
              </div>
            ) : ins.isDetailLoading || !ins.companyDetail ? (
              /* Skeleton while loading */
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-[#1a1a2e] rounded-xl" />
                <div className="h-10 w-72 bg-[#1a1a2e] rounded-xl" />
                <div className="h-40 bg-[#1a1a2e] rounded-2xl" />
                <div className="h-40 bg-[#1a1a2e] rounded-2xl" />
              </div>
            ) : (
              <CompanyDetailPage
                detail={ins.companyDetail}
                activeSubTab={ins.activeSubTab}
                isLoading={ins.isDetailLoading}
                onSubTabChange={ins.setActiveSubTab}
                onBack={ins.backToBrowse}
                onShare={() => ins.openModal(ins.activeCompany ?? undefined)}
                onUpvote={ins.handleUpvote}
                onReport={ins.handleReport}
              />
            )}
          </>
        )}

      </ErrorBoundary>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {ins.toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          bg-[#1a1a2e] border border-[#2a2a3d] rounded-xl px-4 py-2.5
          text-sm text-[#f0f0ff] shadow-xl animate-fade-in
          flex items-center gap-2">
          <i className="fas fa-circle-check text-[#22c55e] text-xs" />
          {ins.toast}
        </div>
      )}

      {/* ── Share Modal ──────────────────────────────────────────────────────── */}
      <ShareModal
        isOpen={ins.isModalOpen}
        step={ins.modalStep}
        submissionType={ins.submissionType}
        expDraft={ins.expDraft}
        prepDraft={ins.prepDraft}
        isSubmitting={ins.isSubmitting}
        submitError={ins.submitError}
        platformInput={ins.platformInput}
        materialInput={ins.materialInput}
        channelInput={ins.channelInput}
        onClose={ins.closeModal}
        onPickType={ins.pickType}
        onBack={ins.backToTypePick}
        onSubmit={ins.handleSubmit}
        onShareAnother={ins.shareAnother}
        onUpdateExp={ins.updateExp}
        onAddRound={ins.addRound}
        onRemoveRound={ins.removeRound}
        onUpdateRound={ins.updateRound}
        onUpdatePrep={ins.updatePrep}
        onAddTag={ins.addTag}
        onRemoveTag={ins.removeTag}
        onPlatformInputChange={ins.setPlatformInput}
        onMaterialInputChange={ins.setMaterialInput}
        onChannelInputChange={ins.setChannelInput}
      />
    </div>
  );
}

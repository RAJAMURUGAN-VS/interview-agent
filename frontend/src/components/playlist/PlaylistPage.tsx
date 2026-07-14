import { usePlaylistGenerator } from '../../hooks/usePlaylistGenerator';
import TopicDurationForm    from './TopicDurationForm';
import RoadmapPreview       from './RoadmapPreview';
import ConnectAccountPrompt from './ConnectAccountPrompt';
import GenerationProgress   from './GenerationProgress';
import SectionVideoList     from './SectionVideoList';
import PlaylistResultCard   from './PlaylistResultCard';

export default function PlaylistPage() {
  const {
    appPhase,
    topic,
    durationHours,
    roadmap,
    jobStatus,
    errorMessage,
    isLoadingRoadmap,
    setTopic,
    setDurationHours,
    handleGenerateRoadmap,
    handleConfirmRoadmap,
    handleRegenerate,
    handleConnect,
    handleReset,
  } = usePlaylistGenerator();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">

        {/* ── Setup phase ───────────────────────────────────────────────── */}
        {appPhase === 'setup' && (
          <TopicDurationForm
            topic={topic}
            durationHours={durationHours}
            isLoading={isLoadingRoadmap}
            onTopicChange={setTopic}
            onDurationChange={setDurationHours}
            onSubmit={handleGenerateRoadmap}
          />
        )}

        {/* ── Roadmap preview ───────────────────────────────────────────── */}
        {appPhase === 'roadmap_preview' && roadmap && (
          <RoadmapPreview
            topic={topic}
            durationHours={durationHours}
            roadmap={roadmap}
            onConfirm={handleConfirmRoadmap}
            onRegenerate={handleRegenerate}
          />
        )}

        {/* ── Checking connection (brief transitional phase) ────────────── */}
        {appPhase === 'checking_connection' && (
          <div className="animate-fade-in flex flex-col items-center justify-center py-24 gap-4">
            <i
              className="fas fa-spinner fa-spin text-3xl"
              style={{ color: 'var(--accent)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Checking YouTube account connection…
            </p>
          </div>
        )}

        {/* ── Connect account prompt ────────────────────────────────────── */}
        {appPhase === 'connect_prompt' && (
          <div className="space-y-6">
            {/* Show progress context while waiting */}
            <div className="card" style={{ padding: '12px 16px' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <i className="fas fa-check-circle mr-1.5" style={{ color: 'var(--success)' }} />
                Roadmap &amp; videos ready — just need your YouTube account to create the playlist.
              </p>
            </div>
            <ConnectAccountPrompt
              isPolling={appPhase === 'connect_prompt'}
              onConnect={(popup) => handleConnect(popup)}
            />

          </div>
        )}

        {/* ── Generating (searching / ranking / creating) ───────────────── */}
        {appPhase === 'generating' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Building Your Playlist
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sit back — this usually takes 30–90 seconds.
              </p>
            </div>

            <GenerationProgress phase={jobStatus?.phase ?? 'searching'} />

            {/* Show selected videos as they arrive */}
            {jobStatus?.selectedVideos && jobStatus.selectedVideos.length > 0 && roadmap && (
              <SectionVideoList
                roadmap={roadmap ?? jobStatus.roadmap ?? []}
                selectedVideos={jobStatus.selectedVideos}
              />
            )}
          </div>
        )}

        {/* ── Complete ──────────────────────────────────────────────────── */}
        {appPhase === 'complete' && jobStatus?.playlistUrl && (
          <div className="space-y-8">
            <GenerationProgress phase="complete" />

            <PlaylistResultCard
              topic={topic}
              playlistUrl={jobStatus.playlistUrl}
              targetDurationMinutes={jobStatus.targetDurationMinutes}
              actualDurationMinutes={jobStatus.actualDurationMinutes}
              videoCount={jobStatus.selectedVideos?.length ?? 0}
              onReset={handleReset}
            />

            {jobStatus.selectedVideos && jobStatus.selectedVideos.length > 0 && (
              <SectionVideoList
                roadmap={roadmap ?? jobStatus.roadmap ?? []}
                selectedVideos={jobStatus.selectedVideos}
              />
            )}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {appPhase === 'error' && (
          <div className="animate-fade-in flex flex-col items-center text-center py-16 gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <i className="fas fa-triangle-exclamation text-2xl" style={{ color: 'var(--danger)' }} />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Something went wrong
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {errorMessage ?? 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
            <button
              id="btn-playlist-try-again"
              onClick={handleReset}
              className="btn-primary px-6 py-2.5 gap-2"
            >
              <i className="fas fa-rotate-left" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

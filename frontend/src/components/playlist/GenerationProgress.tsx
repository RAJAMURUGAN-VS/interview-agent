import type { PlaylistJobPhase } from '../../types';

interface Props {
  phase: PlaylistJobPhase;
}

interface Step {
  id: PlaylistJobPhase | 'done';
  label: string;
  icon: string;
  phases: PlaylistJobPhase[];   // which backend phases map to this step being "active"
  donePhases: PlaylistJobPhase[];  // which phases mean this step is already done
}

const STEPS: Step[] = [
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: 'fa-map',
    phases: ['roadmap'],
    donePhases: ['searching', 'ranking', 'awaiting_connection', 'creating_playlist', 'complete'],
  },
  {
    id: 'searching',
    label: 'Finding Videos',
    icon: 'fa-magnifying-glass',
    phases: ['searching'],
    donePhases: ['ranking', 'awaiting_connection', 'creating_playlist', 'complete'],
  },
  {
    id: 'ranking',
    label: 'Selecting',
    icon: 'fa-star-half-stroke',
    phases: ['ranking'],
    donePhases: ['awaiting_connection', 'creating_playlist', 'complete'],
  },
  {
    id: 'awaiting_connection',
    label: 'Connecting',
    icon: 'fa-link',
    phases: ['awaiting_connection'],
    donePhases: ['creating_playlist', 'complete'],
  },
  {
    id: 'creating_playlist',
    label: 'Creating',
    icon: 'fa-list-check',
    phases: ['creating_playlist'],
    donePhases: ['complete'],
  },
  {
    id: 'done',
    label: 'Done!',
    icon: 'fa-party-horn',
    phases: ['complete'],
    donePhases: [],
  },
];

const PHASE_LABELS: Record<PlaylistJobPhase, string> = {
  roadmap:              'Generating roadmap…',
  searching:            'Searching YouTube for matching videos…',
  ranking:              'Selecting best videos with AI…',
  awaiting_connection:  'Waiting for YouTube account connection…',
  creating_playlist:    'Creating your playlist on YouTube…',
  complete:             'Playlist created successfully!',
  error:                'Something went wrong.',
};

export default function GenerationProgress({ phase }: Props) {
  return (
    <div className="animate-fade-in space-y-8">
      {/* Status label */}
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {phase !== 'error' && <i className="fas fa-spinner fa-spin mr-2" style={{ color: 'var(--accent)' }} />}
          {PHASE_LABELS[phase] ?? 'Processing…'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isActive = step.phases.includes(phase) || (step.id === 'done' && phase === 'complete');
          const isDone   = step.donePhases.includes(phase);
          const isLast   = idx === STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {/* Node */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 52 }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all duration-500"
                  style={{
                    background: isDone
                      ? 'var(--success)'
                      : isActive
                      ? 'var(--accent)'
                      : 'var(--bg-elevated)',
                    border: `2px solid ${isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: isActive ? '0 0 16px rgba(79,70,229,0.4)' : 'none',
                    color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {isDone ? (
                    <i className="fas fa-check text-xs" />
                  ) : (
                    <i className={`fas ${step.icon} text-xs ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <span
                  className="text-xs mt-1 text-center leading-tight"
                  style={{
                    color: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.65rem',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mx-1 transition-all duration-500"
                  style={{
                    background: isDone ? 'var(--success)' : 'var(--border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { PrepPlanPhase } from '../../types';

interface DiscoveryLoadingStateProps {
  phase:      PrepPlanPhase;
  company:    string;
  message:    string;
  isCached:   boolean | null;
}

const PHASE_LABEL: Partial<Record<PrepPlanPhase, string>> = {
  discovering: 'Stage 1 of 2 — Company Research',
  building:    'Stage 2 of 2 — Building Your Plan',
};

export default function DiscoveryLoadingState({
  phase, company, message, isCached,
}: DiscoveryLoadingStateProps) {
  const stageLabel = PHASE_LABEL[phase] ?? 'Working…';

  return (
    <div className="card flex flex-col items-center text-center py-12 gap-6">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2
          border-[#4f46e5] border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2
          border-[#4f46e5]/30 border-b-transparent animate-spin
          [animation-direction:reverse] [animation-duration:1.4s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <i className={`text-[#4f46e5] text-sm
            ${phase === 'discovering' ? 'fas fa-magnifying-glass' : 'fas fa-calendar-days'}`} />
        </div>
      </div>

      {/* Stage label */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-1">
          {stageLabel}
        </p>
        <h2 className="text-lg font-bold text-[#f0f0ff]">
          {company ? `Preparing plan for ${company}` : 'Generating your plan…'}
        </h2>
      </div>

      {/* Cycling message */}
      <p key={message} className="text-sm text-[#8b8ba8] animate-fade-in max-w-xs">
        {message}
      </p>

      {/* Cache notice */}
      {isCached === false && (
        <p className="text-xs text-[#4a4a6a] max-w-xs">
          <i className="fas fa-globe mr-1.5" />
          First time researching {company} — this may take up to 30 seconds.
        </p>
      )}
      {isCached === true && (
        <p className="text-xs text-[#22c55e]">
          <i className="fas fa-bolt mr-1.5" />
          Company data cached — this will be quick.
        </p>
      )}
    </div>
  );
}

import type {
  ExperienceDraft,
  InsightsDepartment,
  InsightsOfferType,
  InsightsDifficulty,
  InsightsOutcome,
} from '../../types';

interface ExperienceFormProps {
  draft: ExperienceDraft;
  onUpdate: (key: keyof ExperienceDraft, value: unknown) => void;
  onAddRound: () => void;
  onRemoveRound: (idx: number) => void;
  onUpdateRound: (idx: number, key: 'roundName' | 'description', value: string) => void;
  disabled: boolean;
}

const DEPARTMENTS: InsightsDepartment[] = ['CSE', 'ECE', 'AIML', 'IT', 'CSBS', 'Other'];
const OFFER_TYPES: InsightsOfferType[]  = ['On-Campus', 'Off-Campus', 'Internship', 'Full-Time'];
const OUTCOMES: InsightsOutcome[]       = ['Selected', 'Rejected', 'Waiting'];

const inputCls = `w-full bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl px-3 py-2.5
  text-sm text-[#f0f0ff] placeholder-[#4a4a6a]
  focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/40
  transition-colors disabled:opacity-50`;

const labelCls = 'block text-xs font-medium text-[#8b8ba8] uppercase tracking-wider mb-1.5';

export default function ExperienceForm({
  draft,
  onUpdate,
  onAddRound,
  onRemoveRound,
  onUpdateRound,
  disabled,
}: ExperienceFormProps) {
  return (
    <div className="space-y-5">
      {/* Company + Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Company *</label>
          <input
            className={inputCls}
            placeholder="e.g. Hexaware"
            value={draft.company}
            onChange={(e) => onUpdate('company', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={labelCls}>Role / Programme *</label>
          <input
            className={inputCls}
            placeholder="e.g. Digital Nurture 5.0 - Java FSE"
            value={draft.role}
            onChange={(e) => onUpdate('role', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Department + Offer type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Department *</label>
          <select
            className={inputCls}
            value={draft.department}
            onChange={(e) => onUpdate('department', e.target.value as InsightsDepartment)}
            disabled={disabled}
          >
            <option value="">Select…</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Offer Type *</label>
          <select
            className={inputCls}
            value={draft.offerType}
            onChange={(e) => onUpdate('offerType', e.target.value as InsightsOfferType)}
            disabled={disabled}
          >
            <option value="">Select…</option>
            {OFFER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Difficulty + Outcome */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Difficulty *</label>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4, 5] as InsightsDifficulty[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onUpdate('difficulty', n)}
                disabled={disabled}
                className={`flex-1 h-9 rounded-xl border text-xs font-bold transition-all
                  ${draft.difficulty === n
                    ? 'border-[#4f46e5] bg-[#4f46e5] text-white'
                    : 'border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5]/40'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Outcome *</label>
          <select
            className={inputCls}
            value={draft.outcome}
            onChange={(e) => onUpdate('outcome', e.target.value as InsightsOutcome)}
            disabled={disabled}
          >
            <option value="">Select…</option>
            {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Rounds */}
      <div>
        <label className={labelCls}>Interview Rounds *</label>
        <div className="space-y-3">
          {draft.rounds.map((round, idx) => (
            <div key={idx} className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder={`Round ${idx + 1} name (e.g. Technical Round)`}
                  value={round.roundName}
                  onChange={(e) => onUpdateRound(idx, 'roundName', e.target.value)}
                  disabled={disabled}
                />
                {draft.rounds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRound(idx)}
                    disabled={disabled}
                    className="w-8 h-8 rounded-lg border border-[#2a2a3d] text-[#4a4a6a]
                      hover:border-[#ef4444]/40 hover:text-[#ef4444] transition-colors
                      flex items-center justify-center flex-shrink-0"
                  >
                    <i className="fas fa-xmark text-xs" />
                  </button>
                )}
              </div>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="What happened? What questions were asked?"
                value={round.description}
                onChange={(e) => onUpdateRound(idx, 'description', e.target.value)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddRound}
          disabled={disabled}
          className="mt-2 text-xs text-[#4f46e5] hover:text-[#818cf8]
            flex items-center gap-1.5 transition-colors"
        >
          <i className="fas fa-plus" /> Add another round
        </button>
      </div>

      {/* Tips */}
      <div>
        <label className={labelCls}>Tips for Juniors</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Any advice you wish you had going in…"
          value={draft.tips}
          onChange={(e) => onUpdate('tips', e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

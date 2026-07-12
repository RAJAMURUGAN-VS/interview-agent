import type { InsightsModalStep, InsightsPostType, ExperienceDraft, PreparationDraft } from '../../types';
import ExperienceForm  from './ExperienceForm';
import PreparationForm from './PreparationForm';

interface ShareModalProps {
  isOpen:         boolean;
  step:           InsightsModalStep;
  submissionType: InsightsPostType | null;
  expDraft:       ExperienceDraft;
  prepDraft:      PreparationDraft;
  isSubmitting:   boolean;
  submitError:    string | null;
  platformInput:  string;
  materialInput:  string;
  channelInput:   string;
  onClose:        () => void;
  onPickType:     (type: InsightsPostType) => void;
  onBack:         () => void;
  onSubmit:       () => void;
  onShareAnother: () => void;
  onUpdateExp:    (key: keyof ExperienceDraft, value: unknown) => void;
  onAddRound:     () => void;
  onRemoveRound:  (idx: number) => void;
  onUpdateRound:  (idx: number, key: 'roundName' | 'description', value: string) => void;
  onUpdatePrep:   (key: keyof PreparationDraft, value: unknown) => void;
  onAddTag:       (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', v: string) => void;
  onRemoveTag:    (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', t: string) => void;
  onPlatformInputChange: (v: string) => void;
  onMaterialInputChange: (v: string) => void;
  onChannelInputChange:  (v: string) => void;
}

const TYPE_OPTS: { value: InsightsPostType; icon: string; title: string; desc: string; accent: string }[] = [
  {
    value:  'experience',
    icon:   'fas fa-comment-dots',
    title:  'My Interview Experience',
    desc:   'Share rounds, questions asked, difficulty, and outcome.',
    accent: 'border-[#4f46e5]/40 bg-[#4f46e5]/5 hover:border-[#4f46e5]/70',
  },
  {
    value:  'preparation',
    icon:   'fas fa-book-open',
    title:  'How I Prepared',
    desc:   'Share platforms, study materials, and preparation strategy.',
    accent: 'border-[#0ea5e9]/40 bg-[#0ea5e9]/5 hover:border-[#0ea5e9]/70',
  },
];

const STEP_TITLE: Record<InsightsModalStep, string> = {
  'type-pick': 'What are you sharing?',
  'form':      '',
  'success':   'Shared!',
};

const FORM_TITLE: Record<InsightsPostType, string> = {
  experience:  'Share Your Interview Experience',
  preparation: 'Share How You Prepared',
};

export default function ShareModal({
  isOpen, step, submissionType,
  expDraft, prepDraft,
  isSubmitting, submitError,
  platformInput, materialInput, channelInput,
  onClose, onPickType, onBack, onSubmit, onShareAnother,
  onUpdateExp, onAddRound, onRemoveRound, onUpdateRound,
  onUpdatePrep, onAddTag, onRemoveTag,
  onPlatformInputChange, onMaterialInputChange, onChannelInputChange,
}: ShareModalProps) {
  if (!isOpen) return null;

  const title = step === 'form' && submissionType
    ? FORM_TITLE[submissionType]
    : STEP_TITLE[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[#13131a] border border-[#2a2a3d] rounded-2xl
        w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3d]">
          <div className="flex items-center gap-3">
            {step === 'form' && (
              <button
                onClick={onBack}
                className="w-7 h-7 rounded-lg border border-[#2a2a3d] flex items-center
                  justify-center text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left text-xs" />
              </button>
            )}
            <h2 className="text-base font-semibold text-[#f0f0ff]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#2a2a3d] flex items-center
              justify-center text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors"
            aria-label="Close"
          >
            <i className="fas fa-xmark text-xs" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 0: type picker ── */}
          {step === 'type-pick' && (
            <div className="space-y-3">
              <p className="text-sm text-[#8b8ba8] mb-4">
                Help a junior who's preparing right now. Choose what you want to share.
              </p>
              {TYPE_OPTS.map(({ value, icon, title, desc, accent }) => (
                <button
                  key={value}
                  onClick={() => onPickType(value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${accent}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] flex items-center
                      justify-center flex-shrink-0 mt-0.5">
                      <i className={`${icon} text-sm text-[#4f46e5]`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#f0f0ff]">{title}</p>
                      <p className="text-xs text-[#8b8ba8] mt-0.5">{desc}</p>
                    </div>
                    <i className="fas fa-chevron-right text-xs text-[#4a4a6a] ml-auto mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 1: form ── */}
          {step === 'form' && submissionType === 'experience' && (
            <ExperienceForm
              draft={expDraft}
              onUpdate={onUpdateExp}
              onAddRound={onAddRound}
              onRemoveRound={onRemoveRound}
              onUpdateRound={onUpdateRound}
              disabled={isSubmitting}
            />
          )}

          {step === 'form' && submissionType === 'preparation' && (
            <PreparationForm
              draft={prepDraft}
              onUpdate={onUpdatePrep}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              platformInput={platformInput}
              materialInput={materialInput}
              channelInput={channelInput}
              onPlatformInputChange={onPlatformInputChange}
              onMaterialInputChange={onMaterialInputChange}
              onChannelInputChange={onChannelInputChange}
              disabled={isSubmitting}
            />
          )}

          {/* ── Step 2: success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20
                flex items-center justify-center">
                <i className="fas fa-circle-check text-2xl text-[#22c55e]" />
              </div>
              <div>
                <p className="text-[#f0f0ff] font-semibold text-base">Thank you!</p>
                <p className="text-sm text-[#8b8ba8] mt-1">
                  Your post is live and will help juniors preparing for this company.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={onShareAnother}
                  className="btn-primary text-sm px-4 py-2"
                >
                  <i className="fas fa-plus mr-2" />Share Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#2a2a3d] text-sm
                    text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — submit button (only on form step) */}
        {step === 'form' && (
          <div className="px-6 py-4 border-t border-[#2a2a3d] flex flex-col gap-2">
            {submitError && (
              <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20
                rounded-xl px-3 py-2">
                <i className="fas fa-circle-exclamation mr-1.5" />{submitError}
              </p>
            )}
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><i className="fas fa-circle-notch fa-spin mr-2" />Submitting…</>
                : <><i className="fas fa-paper-plane mr-2" />Submit</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

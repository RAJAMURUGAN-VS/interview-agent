import type { PreparationDraft, InsightsDepartment } from '../../types';

interface PreparationFormProps {
  draft: PreparationDraft;
  onUpdate: (key: keyof PreparationDraft, value: unknown) => void;
  onAddTag: (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', value: string) => void;
  onRemoveTag: (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', tag: string) => void;
  platformInput: string;
  materialInput: string;
  channelInput: string;
  onPlatformInputChange: (v: string) => void;
  onMaterialInputChange: (v: string) => void;
  onChannelInputChange: (v: string) => void;
  disabled: boolean;
}

const DEPARTMENTS: InsightsDepartment[] = ['CSE', 'ECE', 'AIML', 'IT', 'CSBS', 'Other'];

const inputCls = `w-full bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl px-3 py-2.5
  text-sm text-[#f0f0ff] placeholder-[#4a4a6a]
  focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/40
  transition-colors disabled:opacity-50`;

const labelCls = 'block text-xs font-medium text-[#8b8ba8] uppercase tracking-wider mb-1.5';

function TagInput({
  label,
  icon,
  placeholder,
  tags,
  input,
  onInputChange,
  onAdd,
  onRemove,
  tagColorCls,
  disabled,
}: {
  label: string;
  icon: string;
  placeholder: string;
  tags: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
  tagColorCls: string;
  disabled: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>
        <i className={`${icon} mr-1.5`} />{label}
      </label>
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onAdd(); }
          }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled || !input.trim()}
          className="px-3 rounded-xl border border-[#2a2a3d] text-[#8b8ba8]
            hover:border-[#4f46e5]/40 hover:text-[#4f46e5] transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="fas fa-plus text-xs" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((t) => (
            <span key={t} className={`text-xs px-2.5 py-0.5 rounded-lg border
              flex items-center gap-1.5 ${tagColorCls}`}>
              {t}
              {!disabled && (
                <button
                  onClick={() => onRemove(t)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${t}`}
                >
                  <i className="fas fa-xmark text-[9px]" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PreparationForm({
  draft,
  onUpdate,
  onAddTag,
  onRemoveTag,
  platformInput,
  materialInput,
  channelInput,
  onPlatformInputChange,
  onMaterialInputChange,
  onChannelInputChange,
  disabled,
}: PreparationFormProps) {
  return (
    <div className="space-y-5">
      {/* Company + Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Company *</label>
          <input
            className={inputCls}
            placeholder="e.g. Zoho"
            value={draft.company}
            onChange={(e) => onUpdate('company', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label className={labelCls}>Role / Programme *</label>
          <input
            className={inputCls}
            placeholder="e.g. Software Engineer"
            value={draft.role}
            onChange={(e) => onUpdate('role', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Department + Duration */}
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
          <label className={labelCls}>Prep Duration (weeks) *</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={104}
            placeholder="e.g. 8"
            value={draft.prepDurationWeeks}
            onChange={(e) => onUpdate('prepDurationWeeks', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Tag inputs */}
      <TagInput
        label="Coding Platforms"
        icon="fas fa-code"
        placeholder="e.g. LeetCode (press Enter)"
        tags={draft.codingPlatforms}
        input={platformInput}
        onInputChange={onPlatformInputChange}
        onAdd={() => {
          onAddTag('codingPlatforms', platformInput);
          onPlatformInputChange('');
        }}
        onRemove={(t) => onRemoveTag('codingPlatforms', t)}
        tagColorCls="bg-[#4f46e5]/10 text-[#818cf8] border-[#4f46e5]/20"
        disabled={disabled}
      />

      <TagInput
        label="Study Materials"
        icon="fas fa-book"
        placeholder="e.g. Cracking the Coding Interview"
        tags={draft.studyMaterials}
        input={materialInput}
        onInputChange={onMaterialInputChange}
        onAdd={() => {
          onAddTag('studyMaterials', materialInput);
          onMaterialInputChange('');
        }}
        onRemove={(t) => onRemoveTag('studyMaterials', t)}
        tagColorCls="bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20"
        disabled={disabled}
      />

      <TagInput
        label="YouTube Channels"
        icon="fab fa-youtube"
        placeholder="e.g. Apna College"
        tags={draft.youtubeChannels}
        input={channelInput}
        onInputChange={onChannelInputChange}
        onAdd={() => {
          onAddTag('youtubeChannels', channelInput);
          onChannelInputChange('');
        }}
        onRemove={(t) => onRemoveTag('youtubeChannels', t)}
        tagColorCls="bg-[#22c55e]/10 text-[#86efac] border-[#22c55e]/20"
        disabled={disabled}
      />

      {/* Daily routine */}
      <div>
        <label className={labelCls}>Daily Routine</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="e.g. 2 problems/day + 1 revision topic"
          value={draft.dailyRoutine}
          onChange={(e) => onUpdate('dailyRoutine', e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Advice */}
      <div>
        <label className={labelCls}>General Advice *</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          placeholder="What would you tell a junior starting their prep today?"
          value={draft.advice}
          onChange={(e) => onUpdate('advice', e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

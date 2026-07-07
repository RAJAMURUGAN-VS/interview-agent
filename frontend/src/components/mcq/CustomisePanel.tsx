import type { McqQuestionType, McqQuestionCount } from '../../types';

const COUNT_OPTIONS: McqQuestionCount[] = [5, 10, 15, 20];

interface Props {
  topic: string;
  questionCount: McqQuestionCount;
  questionType: McqQuestionType;
  onTopicChange: (v: string) => void;
  onCountChange: (v: McqQuestionCount) => void;
  onTypeChange:  (v: McqQuestionType) => void;
}

export default function CustomisePanel({
  topic, questionCount, questionType,
  onTopicChange, onCountChange, onTypeChange,
}: Props) {
  return (
    <div className="card flex flex-col gap-5">
      <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium">
        Customise Your Quiz
      </p>

      {/* Topic */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[#8b8ba8]">
          Topic Focus
          <span className="ml-1 text-[#4a4a6a]">(optional — leave blank for mixed)</span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. Virtual Memory, OOP Pillars, SQL Joins…"
          className="bg-[#1c1c27] border border-[#2a2a3d] focus:border-[#4f46e5]
            rounded-xl px-4 py-2.5 text-sm text-[#f0f0ff]
            placeholder-[#4a4a6a] outline-none transition-colors duration-200"
        />
      </div>

      {/* Question count */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#8b8ba8]">Number of Questions</label>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => onCountChange(n)}
              className={`flex-1 py-2 rounded-xl border text-sm font-semibold
                transition-all duration-200
                ${questionCount === n
                  ? 'bg-[#4f46e5]/10 border-[#4f46e5] text-[#4f46e5]'
                  : 'bg-transparent border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Question type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#8b8ba8]">Question Type</label>
        <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d]">
          {([
            { value: 'mcq',       label: 'MCQ (4 options)', icon: 'fas fa-list-ul' },
            { value: 'truefalse', label: 'True / False',    icon: 'fas fa-toggle-on' },
          ] as { value: McqQuestionType; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTypeChange(opt.value)}
              className={`flex-1 flex items-center justify-center gap-2
                px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${questionType === opt.value
                  ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                  : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
            >
              <i className={`${opt.icon} text-xs`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

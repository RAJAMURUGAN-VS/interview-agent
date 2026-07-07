import type { CfLanguage, CfCategory, CfQuestionCount } from '../../types';
import { CP_TOPICS, OOP_TOPICS } from '../../hooks/useCodeFill';
import LanguageSelector from './LanguageSelector';
import CategoryToggle   from './CategoryToggle';
import TopicChips       from './TopicChips';

const COUNT_OPTIONS: CfQuestionCount[] = [5, 10, 15, 20];

interface Props {
  language:        CfLanguage;
  category:        CfCategory;
  selectedTopics:  string[];
  questionCount:   CfQuestionCount;
  customInput:     string;
  isGenerating:    boolean;
  generateError:   string | null;
  onLanguageChange:  (v: CfLanguage) => void;
  onCategoryChange:  (v: CfCategory) => void;
  onToggleTopic:     (t: string) => void;
  onCustomChange:    (v: string) => void;
  onCustomAdd:       () => void;
  onCustomRemove:    (t: string) => void;
  onCountChange:     (v: CfQuestionCount) => void;
  onGenerate:        () => void;
}

export default function CodeFillSetup({
  language, category, selectedTopics, questionCount,
  customInput, isGenerating, generateError,
  onLanguageChange, onCategoryChange, onToggleTopic,
  onCustomChange, onCustomAdd, onCustomRemove,
  onCountChange, onGenerate,
}: Props) {
  const presetTopics = category === 'competitive programming' ? CP_TOPICS : OOP_TOPICS;
  const canGenerate  = selectedTopics.length > 0 && !isGenerating;

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      <LanguageSelector selected={language} onChange={onLanguageChange} />

      <CategoryToggle selected={category} onChange={onCategoryChange} />

      <TopicChips
        presetTopics={presetTopics}
        selectedTopics={selectedTopics}
        customInput={customInput}
        onToggle={onToggleTopic}
        onCustomChange={onCustomChange}
        onCustomAdd={onCustomAdd}
        onCustomRemove={onCustomRemove}
      />

      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Number of Questions
        </p>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => onCountChange(n)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold
                transition-all duration-200 touch-manipulation
                ${questionCount === n
                  ? 'bg-[#4f46e5]/10 border-[#4f46e5] text-[#4f46e5]'
                  : 'bg-transparent border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {generateError && (
        <p className="text-sm text-[#ef4444] text-center">
          <i className="fas fa-circle-exclamation mr-2" />{generateError}
        </p>
      )}

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
          text-white font-semibold text-sm transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
      >
        {isGenerating
          ? <><i className="fas fa-spinner fa-spin mr-2" />Generating…</>
          : <><i className="fas fa-code mr-2" />Generate Questions</>}
      </button>
    </div>
  );
}

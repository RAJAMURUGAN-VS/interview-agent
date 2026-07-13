import type {
  McqFeedback, McqQuestion, McqAnswer, McqReviewFilter,
} from '../../types';
import ReviewCard from './ReviewCard';

const GRADE_COLOR: Record<string, string> = {
  'Excellent':      'text-[#22c55e]',
  'Good':           'text-[#3b82f6]',
  'Needs Revision': 'text-[#f59e0b]',
  'Poor':           'text-[#ef4444]',
};

const FILTER_TABS: { value: McqReviewFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'correct', label: 'Correct ✓' },
  { value: 'wrong',   label: 'Wrong ✗' },
];

interface Props {
  feedback:         McqFeedback;
  questions:        McqQuestion[];
  answers:          McqAnswer[];
  filteredAnswers:  McqAnswer[];
  reviewFilter:     McqReviewFilter;
  reportSaved:      boolean;
  onFilterChange:   (f: McqReviewFilter) => void;
  onRetake:         () => void;
  onNewSameTopic:   () => void;
  onEndSession:     () => void;
  onSaveReport:     () => void;
}

export default function FeedbackView({
  feedback, questions, answers, filteredAnswers,
  reviewFilter, reportSaved, onFilterChange,
  onRetake, onNewSameTopic, onEndSession, onSaveReport,
}: Props) {
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Score card */}
      <div className="card text-center">
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Quiz Complete
        </p>
        <div className={`text-5xl font-bold mb-1 ${GRADE_COLOR[feedback.grade]}`}>
          {feedback.score}
          <span className="text-2xl text-[#4a4a6a]">/{feedback.total}</span>
        </div>
        <p className={`text-lg font-semibold mb-3 ${GRADE_COLOR[feedback.grade]}`}>
          {feedback.grade}
        </p>
        <div className="w-full h-2 bg-[#1c1c27] rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${feedback.percentage}%`,
              background: feedback.percentage >= 90 ? '#22c55e'
                        : feedback.percentage >= 70 ? '#3b82f6'
                        : feedback.percentage >= 50 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <p className="text-sm text-[#8b8ba8] leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Weak areas */}
      {feedback.weak_areas.length > 0 && (
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-[#f59e0b] font-medium mb-3">
            <i className="fas fa-triangle-exclamation mr-1.5" />
            Focus Areas
          </p>
          <div className="flex flex-wrap gap-2">
            {feedback.weak_areas.map((area) => (
              <span key={area}
                className="text-xs px-3 py-1 rounded-lg
                  bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] font-medium">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Study tips */}
      <div className="card">
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a] font-medium mb-3">
          <i className="fas fa-lightbulb mr-1.5 text-[#f59e0b]" />
          Study Tips
        </p>
        <ul className="space-y-2.5">
          {feedback.study_tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#8b8ba8] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full
                bg-[#4f46e5]/10 border border-[#4f46e5]/20
                flex items-center justify-center text-[10px] font-bold text-[#4f46e5] mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Save report */}
      {!reportSaved ? (
        <button
          onClick={onSaveReport}
          className="w-full flex items-center justify-center gap-2
            py-2.5 px-4 rounded-xl border border-[#2a2a3d]
            hover:border-[#4f46e5] hover:bg-[#4f46e5]/5
            text-sm font-medium text-[#8b8ba8] hover:text-[#f0f0ff]
            transition-all duration-200"
        >
          <i className="fas fa-floppy-disk text-[#4f46e5]" />
          Save Report to History
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm
          text-[#22c55e] animate-fade-in">
          <i className="fas fa-circle-check" />
          Report saved to history
        </div>
      )}

      {/* Review section */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Answer Review
        </p>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1
          border border-[#2a2a3d] w-fit mb-4">
          {FILTER_TABS.map((tab) => {
            const count = tab.value === 'all'     ? answers.length
                        : tab.value === 'correct' ? answers.filter((a) => a.is_correct).length
                        : answers.filter((a) => !a.is_correct).length;
            return (
              <button
                key={tab.value}
                onClick={() => onFilterChange(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${reviewFilter === tab.value
                    ? 'bg-[#4f46e5] text-white'
                    : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
              >
                {tab.label}
                <span className="ml-1.5 opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Review cards */}
        <div className="flex flex-col gap-3">
          {filteredAnswers.length === 0 && (
            <p className="text-sm text-[#4a4a6a] text-center py-6">
              No questions in this category.
            </p>
          )}
          {filteredAnswers.map((ans, i) => {
            const q = questionMap[ans.question_id];
            if (!q) return null;
            return <ReviewCard key={ans.question_id} question={q} answer={ans} index={i} />;
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={onRetake}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white
            text-sm font-semibold transition-all duration-200
            hover:shadow-[0_0_12px_rgba(79,70,229,0.3)]"
        >
          <i className="fas fa-rotate-right" />Retake Same
        </button>
        <button
          onClick={onNewSameTopic}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl border border-[#2a2a3d] hover:border-[#4f46e5]
            text-[#8b8ba8] hover:text-[#f0f0ff] text-sm font-semibold
            transition-all duration-200 hover:bg-[#1c1c27]"
        >
          <i className="fas fa-wand-magic-sparkles" />New Questions
        </button>
        <button
          onClick={onEndSession}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl border border-[#2a2a3d] text-[#4a4a6a]
            hover:text-[#8b8ba8] text-sm font-semibold transition-all duration-200"
        >
          <i className="fas fa-xmark" />End Session
        </button>
      </div>
    </div>
  );
}

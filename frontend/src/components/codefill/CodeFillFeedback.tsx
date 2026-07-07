import type { CfFeedback, CfQuestion, CfAnswerRecord } from '../../types';
import CodeFillReviewCard from './CodeFillReviewCard';

const GRADE_COLOR: Record<string, string> = {
  'Excellent':      'text-[#22c55e]',
  'Good':           'text-[#3b82f6]',
  'Needs Practice': 'text-[#f59e0b]',
  'Struggling':     'text-[#ef4444]',
};

interface Props {
  feedback:       CfFeedback;
  questions:      CfQuestion[];
  answerRecords:  CfAnswerRecord[];
  reviewOpenId:   string | null;
  onToggleReview: (id: string) => void;
  onRetake:       () => void;
  onNewQuestions: () => void;
  onEndSession:   () => void;
}

export default function CodeFillFeedback({
  feedback, questions, answerRecords, reviewOpenId,
  onToggleReview, onRetake, onNewQuestions, onEndSession,
}: Props) {
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Score card */}
      <div className="card text-center">
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Session Complete
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

      {/* Strong + weak topics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {feedback.strong_topics.length > 0 && (
          <div className="card">
            <p className="text-xs uppercase tracking-widest text-[#22c55e] font-medium mb-3">
              <i className="fas fa-thumbs-up mr-1.5" />Strong Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {feedback.strong_topics.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg
                  bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {feedback.weak_topics.length > 0 && (
          <div className="card">
            <p className="text-xs uppercase tracking-widest text-[#f59e0b] font-medium mb-3">
              <i className="fas fa-triangle-exclamation mr-1.5" />Focus Areas
            </p>
            <div className="flex flex-wrap gap-2">
              {feedback.weak_topics.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg
                  bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="card">
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a] font-medium mb-3">
          <i className="fas fa-lightbulb mr-1.5 text-[#f59e0b]" />Tips to Improve
        </p>
        <ul className="space-y-2.5">
          {feedback.tips.map((tip, i) => (
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

      {/* Question review */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Question Review
        </p>
        <div className="flex flex-col gap-2">
          {answerRecords.map((rec, i) => {
            const q = questionMap[rec.question_id];
            if (!q) return null;
            return (
              <CodeFillReviewCard
                key={rec.question_id}
                question={q}
                record={rec}
                index={i}
                isOpen={reviewOpenId === rec.question_id}
                onToggle={() => onToggleReview(rec.question_id)}
              />
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button onClick={onRetake}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white
            text-sm font-semibold transition-all duration-200
            hover:shadow-[0_0_12px_rgba(79,70,229,0.3)]">
          <i className="fas fa-rotate-right" />Retake Same
        </button>
        <button onClick={onNewQuestions}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl border border-[#2a2a3d] hover:border-[#4f46e5]
            text-[#8b8ba8] hover:text-[#f0f0ff] text-sm font-semibold
            transition-all duration-200 hover:bg-[#1c1c27]">
          <i className="fas fa-code" />New Questions
        </button>
        <button onClick={onEndSession}
          className="flex items-center justify-center gap-2 py-3 px-4
            rounded-xl border border-[#2a2a3d] text-[#4a4a6a]
            hover:text-[#8b8ba8] text-sm font-semibold transition-all duration-200">
          <i className="fas fa-xmark" />End Session
        </button>
      </div>
    </div>
  );
}

/**
 * PrepAssessmentRunner
 *
 * Self-contained inline MCQ quiz for a single Prep Plan day.
 * Lifecycle: fetching → quiz → results
 * Calls onComplete({ score, total, percentage, weakAreas }) when done.
 */

import { useState, useCallback } from 'react';
import type {
  McqQuestion,
  McqAnswer,
  PrepDayScore,
  PrepAssessmentConfig,
} from '../../types';
import { generatePrepAssessment } from '../../api/prepPlanApi';

// ── Sub-types ────────────────────────────────────────────────────────────────

type RunnerPhase = 'idle' | 'fetching' | 'quiz' | 'results' | 'error';

interface Props {
  company:          string;
  topic:            string;
  dayNumber:        number;
  assessmentConfig: PrepAssessmentConfig;
  conceptsToMaster: string[];   // specific sub-skills to seed question generation
  formatNotes:      string;     // company format grounding
  onComplete:       (result: Omit<PrepDayScore, 'completedAt'>) => void;
  onClose:          () => void;
}

// ── Difficulty stars ─────────────────────────────────────────────────────────

const DIFF_STARS: Record<string, number> = {
  'Easy': 1, 'Easy-Medium': 2, 'Medium': 3, 'Medium-High': 4, 'High': 5,
};

function DifficultyStars({ tier }: { tier: string }) {
  const count = DIFF_STARS[tier] ?? 3;
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fas fa-star text-[10px]
          ${i < count ? 'text-[#f59e0b]' : 'text-[#2a2a3d]'}`} />
      ))}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PrepAssessmentRunner({
  company, topic, dayNumber, assessmentConfig,
  conceptsToMaster, formatNotes,
  onComplete, onClose,
}: Props) {
  const [phase, setPhase]             = useState<RunnerPhase>('idle');
  const [questions, setQuestions]     = useState<McqQuestion[]>([]);
  const [current, setCurrent]         = useState(0);
  const [answers, setAnswers]         = useState<McqAnswer[]>([]);
  const [selected, setSelected]       = useState<string | null>(null);
  const [isAnswered, setIsAnswered]   = useState(false);
  const [fillInput, setFillInput]     = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  const { questionCount, difficulty, estimatedMinutes, questionType } = assessmentConfig;
  const q = questions[current] ?? null;
  const isLast = current === questions.length - 1;

  // ── Fetch questions ────────────────────────────────────────────────────────
  const startAssessment = useCallback(async () => {
    setPhase('fetching');
    setErrorMsg('');
    try {
      const res = await generatePrepAssessment({
        company,
        topic,
        difficulty,
        questionCount,
        conceptsToMaster,
        formatNotes,
      });
      if (!res.success || !res.questions?.length) {
        setErrorMsg(res.error ?? 'Could not generate questions. Try again.');
        setPhase('error');
        return;
      }
      setQuestions(res.questions);
      setCurrent(0);
      setAnswers([]);
      setSelected(null);
      setIsAnswered(false);
      setFillInput('');
      setPhase('quiz');
    } catch {
      setErrorMsg('Network error — is the backend running?');
      setPhase('error');
    }
  }, [company, topic, difficulty, questionCount]);

  // ── Select MCQ option ──────────────────────────────────────────────────────
  const handleSelect = useCallback((label: string) => {
    if (isAnswered || !q) return;
    setSelected(label);
    const newAnswer: McqAnswer = {
      question_id:    q.id,
      selected_label: label,
      fill_input:     '',
      is_correct:     label === q.correct_label,
      status:         'answered',
    };
    setAnswers(prev => [...prev, newAnswer]);
    setIsAnswered(true);
  }, [isAnswered, q]);

  // ── Next / finish ──────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (!q) return;

    if (isLast) {
      // Build the complete answer list INCLUDING the current question.
      // We can't rely on the `answers` state here because React hasn't flushed
      // the setState from handleSelect yet — so we reconstruct it directly.
      const currentAnswer: McqAnswer = {
        question_id:    q.id,
        selected_label: selected ?? '',
        fill_input:     '',
        is_correct:     (selected ?? '') === q.correct_label,
        status:         'answered',
      };
      // answers already contains q1..q(n-1); add the current question's answer
      const finalAnswers = [...answers, currentAnswer];

      const score      = finalAnswers.filter(a => a.is_correct).length;
      const total      = questions.length;
      const percentage = Math.round((score / total) * 100);

      const weakAreas = finalAnswers
        .filter(a => !a.is_correct)
        .map(a => {
          const qi = questions.find(x => x.id === a.question_id);
          return qi?.question.slice(0, 60) ?? '';
        })
        .filter(Boolean)
        .slice(0, 3);

      // Persist the full answer list so the results screen has it
      setAnswers(finalAnswers);

      // Show results FIRST — then call onComplete so the parent doesn't
      // close the runner before the results screen renders
      setPhase('results');
      onComplete({ dayNumber, topic, score, total, percentage, weakAreas });
    } else {
      setCurrent(i => i + 1);
      setSelected(null);
      setIsAnswered(false);
      setFillInput('');
    }
  }, [q, isLast, selected, answers, questions, dayNumber, topic, onComplete]);

  const scoreForDisplay = answers.filter(a => a.is_correct).length;

  // ── IDLE — mission card ────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#4f46e5]/15 border border-[#4f46e5]/30
            flex items-center justify-center flex-shrink-0">
            <i className="fas fa-bullseye text-[#4f46e5] text-sm" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#4f46e5] uppercase tracking-wider">
              Today's Mission
            </p>
            <p className="text-sm font-bold text-[#f0f0ff]">Assessment</p>
          </div>
        </div>

        <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-[#8b8ba8] mb-1">Questions</p>
              <p className="text-lg font-bold text-[#f0f0ff]">{questionCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#8b8ba8] mb-1">Difficulty</p>
              <div className="flex justify-center mt-1">
                <DifficultyStars tier={difficulty} />
              </div>
            </div>
            <div>
              <p className="text-xs text-[#8b8ba8] mb-1">Est. Time</p>
              <p className="text-lg font-bold text-[#f0f0ff]">{estimatedMinutes}m</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8b8ba8]
            bg-[#13131a] rounded-xl px-3 py-2 border border-[#2a2a3d]">
            <i className={`fas ${questionType === 'truefalse'
              ? 'fa-toggle-on text-[#f59e0b]'
              : 'fa-circle-question text-[#4f46e5]'} flex-shrink-0`} />
            {questionType === 'truefalse'
              ? 'True / False format (aptitude-style)'
              : 'Multiple choice questions'}
          </div>
        </div>

        <button
          onClick={startAssessment}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          <i className="fas fa-play mr-2" />Start Assessment
        </button>
      </div>
    );
  }

  // ── FETCHING ──────────────────────────────────────────────────────────────
  if (phase === 'fetching') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#4f46e5]
          border-t-transparent animate-spin" />
        <p className="text-sm text-[#8b8ba8]">
          Generating {questionCount} questions on <span className="text-[#f0f0ff]">{topic}</span>…
        </p>
        <p className="text-xs text-[#4a4a6a]">
          Questions are tailored for {company} interview style
        </p>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-[#ef4444]/5 border
          border-[#ef4444]/20 rounded-xl p-4">
          <i className="fas fa-circle-exclamation text-[#ef4444] mt-0.5" />
          <p className="text-sm text-[#f0f0ff]">{errorMsg}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={startAssessment} className="btn-primary text-sm px-4 py-2">
            <i className="fas fa-rotate mr-2" />Retry
          </button>
          <button onClick={onClose}
            className="text-sm px-4 py-2 rounded-xl border border-[#2a2a3d]
              text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz' && q) {
    const progressPct = Math.round((current / questions.length) * 100);

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8b8ba8]">
            Question {current + 1} of {questions.length}
          </span>
          <span className="text-xs font-medium text-[#4f46e5]">
            {scoreForDisplay} correct so far
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#2a2a3d] rounded-full overflow-hidden">
          <div className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>

        {/* Question */}
        <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-4">
          <p className="text-sm text-[#f0f0ff] leading-relaxed font-medium">
            {q.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map(opt => {
            const isSelected = selected === opt.label;
            const isCorrect  = q.correct_label === opt.label;
            let cls = 'border-[#2a2a3d] text-[#c0c0d8] hover:border-[#4f46e5]/40 hover:text-[#f0f0ff]';
            if (isAnswered) {
              if (isCorrect)       cls = 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]';
              else if (isSelected) cls = 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]';
              else                 cls = 'border-[#2a2a3d] text-[#4a4a6a]';
            } else if (isSelected) {
              cls = 'border-[#4f46e5] bg-[#4f46e5]/10 text-[#f0f0ff]';
            }

            return (
              <button key={opt.label}
                onClick={() => handleSelect(opt.label)}
                disabled={isAnswered}
                className={`w-full text-left flex items-center gap-3 px-4 py-3
                  rounded-xl border text-sm transition-all duration-200
                  disabled:cursor-default ${cls}`}
              >
                <span className="w-6 h-6 rounded-lg border border-current
                  flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {opt.label}
                </span>
                {opt.text}
                {isAnswered && isCorrect && (
                  <i className="fas fa-check ml-auto text-[#22c55e] text-xs" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <i className="fas fa-xmark ml-auto text-[#ef4444] text-xs" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation + next */}
        {isAnswered && (
          <div className="space-y-3 animate-fade-in">
            {q.explanation && (
              <div className="bg-[#4f46e5]/5 border border-[#4f46e5]/20
                rounded-xl px-4 py-3 text-xs text-[#c0c0d8] leading-relaxed">
                <i className="fas fa-circle-info text-[#4f46e5] mr-2" />
                {q.explanation}
              </div>
            )}
            <button onClick={handleNext} className="btn-primary w-full py-2.5 text-sm">
              {isLast
                ? <><i className="fas fa-flag-checkered mr-2" />See Results</>
                : <><i className="fas fa-arrow-right mr-2" />Next Question</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const score      = answers.filter(a => a.is_correct).length;
    const total      = questions.length;
    const percentage = Math.round((score / total) * 100);
    const passed     = percentage >= 70;

    const gradeInfo = percentage >= 90
      ? { label: 'Excellent', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10 border-[#22c55e]/20' }
      : percentage >= 70
      ? { label: 'Good', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/20' }
      : percentage >= 50
      ? { label: 'Needs Work', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/20' }
      : { label: 'Revisit', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/20' };

    return (
      <div className="space-y-5 animate-fade-in">
        {/* Score card */}
        <div className={`rounded-xl border p-5 text-center ${gradeInfo.bg}`}>
          <p className={`text-3xl font-bold mb-1 ${gradeInfo.color}`}>
            {score}/{total}
          </p>
          <p className={`text-sm font-semibold ${gradeInfo.color}`}>
            {gradeInfo.label} — {percentage}%
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-3 text-center">
            <p className="text-xs text-[#8b8ba8] mb-1">Correct</p>
            <p className="text-lg font-bold text-[#22c55e]">{score}</p>
          </div>
          <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-3 text-center">
            <p className="text-xs text-[#8b8ba8] mb-1">Wrong</p>
            <p className="text-lg font-bold text-[#ef4444]">{total - score}</p>
          </div>
        </div>

        {/* Adaptive hint */}
        {!passed && (
          <div className="flex items-start gap-2 bg-[#f59e0b]/5 border
            border-[#f59e0b]/20 rounded-xl px-4 py-3 text-xs text-[#c0c0d8]">
            <i className="fas fa-rotate text-[#f59e0b] mt-0.5 flex-shrink-0" />
            Score below 70% — this day is marked for <span className="text-[#f59e0b]
              font-semibold mx-1">revisit</span> in your plan sidebar.
          </div>
        )}
        {passed && (
          <div className="flex items-start gap-2 bg-[#22c55e]/5 border
            border-[#22c55e]/20 rounded-xl px-4 py-3 text-xs text-[#c0c0d8]">
            <i className="fas fa-circle-check text-[#22c55e] mt-0.5 flex-shrink-0" />
            Day complete! Move on to the next topic.
          </div>
        )}

        {/* Question review */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-wider">
            Review
          </p>
          {questions.map((qn, i) => {
            const ans = answers.find(a => a.question_id === qn.id);
            const correct = ans?.is_correct ?? false;
            return (
              <div key={qn.id}
                className={`rounded-xl border px-4 py-3 text-xs
                  ${correct
                    ? 'border-[#22c55e]/20 bg-[#22c55e]/5'
                    : 'border-[#ef4444]/20 bg-[#ef4444]/5'}`}
              >
                <div className="flex items-start gap-2">
                  <i className={`fas ${correct ? 'fa-check text-[#22c55e]' : 'fa-xmark text-[#ef4444]'}
                    mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#c0c0d8] leading-relaxed">{qn.question}</p>
                    {!correct && (
                      <p className="text-[#22c55e] mt-1">
                        Correct: {qn.correct_label} — {
                          qn.options.find(o => o.label === qn.correct_label)?.text
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="btn-primary flex-1 py-2.5 text-sm">
            <i className="fas fa-check mr-2" />Done
          </button>
          <button
            onClick={() => {
              setPhase('idle');
              setAnswers([]);
              setCurrent(0);
              setSelected(null);
              setIsAnswered(false);
            }}
            className="flex-1 py-2.5 text-sm rounded-xl border border-[#2a2a3d]
              text-[#8b8ba8] hover:text-[#f0f0ff] transition-colors"
          >
            <i className="fas fa-rotate mr-2" />Retake
          </button>
        </div>
      </div>
    );
  }

  return null;
}

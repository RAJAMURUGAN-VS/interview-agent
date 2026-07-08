import { useMcq } from '../../hooks/useMcq';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import SetupPanel    from './SetupPanel';
import QuizView      from './QuizView';
import FeedbackView  from './FeedbackView';
import CustomisePanel from './CustomisePanel';
import TextUpload    from './TextUpload';
import PdfUpload     from './PdfUpload';
import UrlInput      from './UrlInput';
import ReviewCard    from './ReviewCard';
import type { McqSourceType, McqQuestionType, McqQuestionCount, McqReviewFilter } from '../../types';

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

export default function McqPage() {
  const mcq = useMcq();

  // Page header — shared across all phases
  const header = (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-1">
        Practice Mode
      </p>
      <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">
        MCQ Practice
      </h1>
      <p className="text-sm text-[#8b8ba8] mt-1">
        Upload your notes, customise your quiz, and test your knowledge
      </p>
    </div>
  );

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
      {header}

      <ErrorBoundary>

        {/* ── SETUP PHASE — two columns ───────────────────────────────────── */}
        {mcq.phase === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Left col — upload area */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
                  Upload Your Notes
                </p>
                {/* Source toggle */}
                <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1
                  border border-[#2a2a3d] w-fit mb-4 flex-wrap">
                  {([
                    { value: 'text',  label: 'Paste Text', icon: 'fas fa-keyboard' },
                    { value: 'pdf',   label: 'Upload PDF', icon: 'fas fa-file-pdf' },
                    { value: 'topic', label: 'By Topic',   icon: 'fas fa-lightbulb' },
                    { value: 'url',   label: 'From URL',   icon: 'fas fa-globe' },
                  ] as { value: McqSourceType; label: string; icon: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => mcq.setSourceType(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg
                        text-sm font-medium transition-all duration-200
                        ${mcq.config.source_type === opt.value
                          ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                          : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
                    >
                      <i className={`${opt.icon} text-xs`} />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {mcq.config.source_type === 'text'
                  ? <TextUpload value={mcq.textContent} onChange={mcq.setTextContent} disabled={mcq.isGenerating} />
                  : mcq.config.source_type === 'pdf'
                  ? <PdfUpload  file={mcq.pdfFile}  onFileSelect={mcq.setPdfFile} disabled={mcq.isGenerating} />
                  : mcq.config.source_type === 'topic'
                  ? <div className="flex flex-col gap-2">
                      <label className="text-xs uppercase tracking-widest text-[#8b8ba8]
                        font-medium">
                        Topic Name
                      </label>
                      <input
                        type="text"
                        value={mcq.config.topic}
                        onChange={(e) => mcq.setTopic(e.target.value)}
                        disabled={mcq.isGenerating}
                        placeholder="e.g. Binary Search Trees, SQL Joins, OOP in Java…"
                        className="bg-[#1c1c27] border border-[#2a2a3d] focus:border-[#4f46e5]
                          rounded-xl px-4 py-3 text-sm text-[#f0f0ff] placeholder-[#4a4a6a]
                          outline-none transition-colors duration-200 disabled:opacity-40"
                      />
                      <p className="text-xs text-[#4a4a6a]">
                        <i className="fas fa-info-circle mr-1" />
                        AI will generate questions from its own knowledge on this topic.
                      </p>
                    </div>
                  : mcq.config.source_type === 'url'
                  ? <UrlInput
                      urls={mcq.urlList}
                      onChange={mcq.setUrlList}
                      disabled={mcq.isGenerating}
                    />
                  : null}
              </div>
            </div>

            {/* Right col — customise + generate */}
            <div className="flex flex-col gap-5 lg:sticky lg:top-24">
              <CustomisePanel
                topic={mcq.config.topic}
                questionCount={mcq.config.question_count}
                questionType={mcq.config.question_type}
                timerConfig={mcq.timerConfig}
                onTopicChange={mcq.setTopic}
                onCountChange={mcq.setQuestionCount}
                onTypeChange={mcq.setQuestionType}
                onTimerChange={mcq.updateTimerConfig}
              />

              {mcq.generateError && (
                <p className="text-sm text-[#ef4444] text-center">
                  <i className="fas fa-circle-exclamation mr-2" />{mcq.generateError}
                </p>
              )}

              {mcq.failedUrls.length > 0 && (
                <div className="text-xs text-[#f59e0b] bg-[#f59e0b]/8
                  border border-[#f59e0b]/20 rounded-xl px-4 py-3">
                  <i className="fas fa-triangle-exclamation mr-2" />
                  Could not extract content from {mcq.failedUrls.length} URL(s):
                  <ul className="mt-1 ml-4 list-disc">
                    {mcq.failedUrls.map((u) => (
                      <li key={u} className="truncate">{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={mcq.handleGenerate}
                disabled={
                  mcq.isGenerating ||
                  (mcq.config.source_type === 'text'
                    ? mcq.textContent.trim().length < 100
                    : mcq.config.source_type === 'pdf'
                    ? mcq.pdfFile === null
                    : mcq.config.source_type === 'topic'
                    ? mcq.config.topic.trim().length === 0
                    : mcq.config.source_type === 'url'
                    ? mcq.urlList.length === 0
                    : true)
                }
                className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
                  text-white font-semibold text-sm transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              >
                {mcq.isGenerating
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Generating Questions…</>
                  : <><i className="fas fa-wand-magic-sparkles mr-2" />Generate Questions</>}
              </button>
            </div>
          </div>
        )}

        {/* ── QUIZ PHASE — two columns ─────────────────────────────────────── */}
        {mcq.phase === 'quiz' && mcq.currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Left col — question card */}
            <div className="lg:sticky lg:top-24">
              <QuizView
                questions={mcq.questions}
                currentQuestion={mcq.currentQuestion}
                currentIndex={mcq.currentIndex}
                selectedLabel={mcq.selectedLabel}
                isAnswered={mcq.isAnswered}
                isLast={mcq.isLastQuestion}
                onSelect={mcq.handleSelectOption}
                onNext={mcq.handleNext}
                timerConfig={mcq.timerConfig}
                timeRemaining={mcq.timeRemaining}
                fillInput={mcq.fillInput}
                onFillChange={mcq.setFillInput}
              />
            </div>

            {/* Right col — quiz progress overview */}
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium">
                Progress
              </p>
              <div className="grid grid-cols-5 gap-2">
                {mcq.questions.map((q, i) => {
                  const ans = mcq.answers.find((a) => a.question_id === q.id);
                  const isCurrent = i === mcq.currentIndex;
                  const isDone = ans !== undefined;
                  return (
                    <div
                      key={q.id}
                      className={`h-10 rounded-xl border flex items-center
                        justify-center text-xs font-bold transition-all duration-200
                        ${isCurrent
                          ? 'bg-[#4f46e5]/20 border-[#4f46e5] text-[#4f46e5]'
                          : isDone
                          ? ans!.is_correct
                            ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                            : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                          : 'bg-[#1c1c27] border-[#2a2a3d] text-[#4a4a6a]'}`}
                    >
                      {isDone
                        ? <i className={`fas ${ans!.is_correct ? 'fa-check' : 'fa-xmark'} text-xs`} />
                        : i + 1}
                    </div>
                  );
                })}
              </div>

              <div className="card mt-2">
                <p className="text-xs text-[#8b8ba8] mb-2 font-medium">Session stats</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-[#22c55e]">
                      {mcq.answers.filter((a) => a.is_correct).length}
                    </p>
                    <p className="text-xs text-[#4a4a6a]">Correct</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#ef4444]">
                      {mcq.answers.filter((a) => !a.is_correct).length}
                    </p>
                    <p className="text-xs text-[#4a4a6a]">Wrong</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#8b8ba8]">
                      {mcq.questions.length - mcq.currentIndex - 1}
                    </p>
                    <p className="text-xs text-[#4a4a6a]">Left</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FEEDBACK LOADING ─────────────────────────────────────────────── */}
        {mcq.phase === 'feedback' && mcq.isFeedbackLoading && (
          <div className="card text-center py-16 max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full
              border-2 border-[#4f46e5] border-t-transparent animate-spin" />
            <p className="text-sm text-[#8b8ba8]">Analysing your answers…</p>
          </div>
        )}

        {/* ── FEEDBACK PHASE — two columns ─────────────────────────────────── */}
        {mcq.phase === 'feedback' && !mcq.isFeedbackLoading && mcq.feedback && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Left col — score + weak areas + tips + actions (sticky) */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">

              {/* Score card */}
              <div className="card text-center">
                <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
                  Quiz Complete
                </p>
                <div className={`text-5xl font-bold mb-1 ${GRADE_COLOR[mcq.feedback.grade]}`}>
                  {mcq.feedback.score}
                  <span className="text-2xl text-[#4a4a6a]">/{mcq.feedback.total}</span>
                </div>
                <p className={`text-lg font-semibold mb-3 ${GRADE_COLOR[mcq.feedback.grade]}`}>
                  {mcq.feedback.grade}
                </p>
                <div className="w-full h-2 bg-[#1c1c27] rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${mcq.feedback.percentage}%`,
                      background: mcq.feedback.percentage >= 90 ? '#22c55e'
                                : mcq.feedback.percentage >= 70 ? '#3b82f6'
                                : mcq.feedback.percentage >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <p className="text-sm text-[#8b8ba8] leading-relaxed">{mcq.feedback.summary}</p>
              </div>

              {/* Weak areas */}
              {mcq.feedback.weak_areas.length > 0 && (
                <div className="card">
                  <p className="text-xs uppercase tracking-widest text-[#f59e0b] font-medium mb-3">
                    <i className="fas fa-triangle-exclamation mr-1.5" />Focus Areas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mcq.feedback.weak_areas.map((area) => (
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
                  <i className="fas fa-lightbulb mr-1.5 text-[#f59e0b]" />Study Tips
                </p>
                <ul className="space-y-2.5">
                  {mcq.feedback.study_tips.map((tip, i) => (
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

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button onClick={mcq.handleRetake}
                  className="flex items-center justify-center gap-2 py-3 px-4
                    rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white
                    text-sm font-semibold transition-all duration-200
                    hover:shadow-[0_0_12px_rgba(79,70,229,0.3)]">
                  <i className="fas fa-rotate-right" />Retake Same
                </button>
                <button onClick={mcq.handleNewSameTopic}
                  className="flex items-center justify-center gap-2 py-3 px-4
                    rounded-xl border border-[#2a2a3d] hover:border-[#4f46e5]
                    text-[#8b8ba8] hover:text-[#f0f0ff] text-sm font-semibold
                    transition-all duration-200 hover:bg-[#1c1c27]">
                  <i className="fas fa-wand-magic-sparkles" />New Questions
                </button>
                <button onClick={mcq.handleEndSession}
                  className="flex items-center justify-center gap-2 py-3 px-4
                    rounded-xl border border-[#2a2a3d] text-[#4a4a6a]
                    hover:text-[#8b8ba8] text-sm font-semibold transition-all duration-200">
                  <i className="fas fa-xmark" />End Session
                </button>
              </div>
            </div>

            {/* Right col — scrollable review list */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium">
                  Answer Review
                </p>
                {/* Filter tabs */}
                <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d]">
                  {FILTER_TABS.map((tab) => {
                    const count = tab.value === 'all'
                      ? mcq.answers.length
                      : tab.value === 'correct'
                      ? mcq.answers.filter((a) => a.is_correct).length
                      : mcq.answers.filter((a) => !a.is_correct).length;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => mcq.setReviewFilter(tab.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium
                          transition-all duration-200
                          ${mcq.reviewFilter === tab.value
                            ? 'bg-[#4f46e5] text-white'
                            : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
                      >
                        {tab.label}
                        <span className="ml-1.5 opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 160px)' }}>
                {mcq.filteredAnswers.length === 0 && (
                  <p className="text-sm text-[#4a4a6a] text-center py-6">
                    No questions in this category.
                  </p>
                )}
                {mcq.filteredAnswers.map((ans, i) => {
                  const q = mcq.questions.find((q) => q.id === ans.question_id);
                  if (!q) return null;
                  return <ReviewCard key={ans.question_id} question={q} answer={ans} index={i} />;
                })}
              </div>
            </div>
          </div>
        )}

      </ErrorBoundary>
    </div>
  );
}

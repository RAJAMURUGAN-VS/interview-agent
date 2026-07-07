import { useCodeFill } from '../../hooks/useCodeFill';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import CodeFillSetup    from './CodeFillSetup';
import CodeFillQuiz     from './CodeFillQuiz';
import CodeFillFeedback from './CodeFillFeedback';

export default function CodeFillPage() {
  const cf = useCodeFill();

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-12">

      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-2">
          Code Practice
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          Code Fill
        </h1>
        <p className="text-sm text-[#8b8ba8]">
          Fill in the critical logic — strengthen your coding instincts
        </p>
      </div>

      <ErrorBoundary>

        {cf.phase === 'setup' && (
          <CodeFillSetup
            language={cf.config.language}
            category={cf.config.category}
            selectedTopics={cf.config.topics}
            questionCount={cf.config.question_count}
            customInput={cf.customTopicInput}
            isGenerating={cf.isGenerating}
            generateError={cf.generateError}
            onLanguageChange={cf.setLanguage}
            onCategoryChange={cf.setCategory}
            onToggleTopic={cf.toggleTopic}
            onCustomChange={cf.setCustomTopicInput}
            onCustomAdd={cf.addCustomTopic}
            onCustomRemove={cf.removeCustomTopic}
            onCountChange={cf.setQuestionCount}
            onGenerate={cf.handleGenerate}
          />
        )}

        {cf.phase === 'quiz' && cf.currentQuestion && (
          <CodeFillQuiz
            question={cf.currentQuestion}
            questionNumber={cf.currentIndex + 1}
            totalQuestions={cf.questions.length}
            userInputs={cf.userInputs}
            attempts={cf.attempts}
            hintUnlocked={cf.hintUnlocked}
            hintVisible={cf.hintVisible}
            isAnswered={cf.isAnswered}
            isWrongShake={cf.isWrongShake}
            blankResults={cf.blankResults}
            isChecking={cf.isChecking}
            isLast={cf.isLastQuestion}
            onInputChange={cf.handleInputChange}
            onSubmit={cf.handleSubmit}
            onShowHint={cf.handleShowHint}
            onSkip={cf.handleSkip}
            onNext={cf.handleNext}
          />
        )}

        {cf.phase === 'feedback' && cf.isFeedbackLoading && (
          <div className="card text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full
              border-2 border-[#4f46e5] border-t-transparent animate-spin" />
            <p className="text-sm text-[#8b8ba8]">Analysing your session…</p>
          </div>
        )}

        {cf.phase === 'feedback' && !cf.isFeedbackLoading && cf.feedback && (
          <CodeFillFeedback
            feedback={cf.feedback}
            questions={cf.questions}
            answerRecords={cf.answerRecords}
            reviewOpenId={cf.reviewOpenId}
            onToggleReview={(id) =>
              cf.setReviewOpenId(cf.reviewOpenId === id ? null : id)
            }
            onRetake={cf.handleRetake}
            onNewQuestions={cf.handleNewQuestions}
            onEndSession={cf.handleEndSession}
          />
        )}

      </ErrorBoundary>
    </div>
  );
}

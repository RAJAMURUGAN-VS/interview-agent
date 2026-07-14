import { useDoubtSolver } from '../../hooks/useDoubtSolver';
import QuestionInput from './QuestionInput';
import AnswerView from './AnswerView';

export default function DoubtSolverPage() {
  const {
    phase,
    question,
    result,
    errorMessage,
    recentQuestions,
    setQuestion,
    submitQuestion,
    selectRecent,
    reset,
  } = useDoubtSolver();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        {/* Hero header */}
        <div className="text-center space-y-3 mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 0 32px rgba(79,70,229,0.4)',
            }}
          >
            <i className="fas fa-lightbulb text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Doubt Solver
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Ask any concept-based question and get a comprehensive answer with curated resources.
          </p>
        </div>

        {/* Content based on phase */}
        {phase === 'idle' || phase === 'loading' ? (
          <div className="card space-y-6">
            <QuestionInput
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={submitQuestion}
              isLoading={phase === 'loading'}
              recentQuestions={recentQuestions}
              onSelectRecent={selectRecent}
            />
          </div>
        ) : phase === 'answered' && result ? (
          <AnswerView result={result} isLoading={false} onReset={reset} />
        ) : phase === 'error' ? (
          <div className="space-y-4 animate-fade-in">
            <div
              className="px-4 py-3 rounded-lg flex items-center gap-3"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <i className="fas fa-exclamation-circle text-lg" style={{ color: 'var(--danger)' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--danger)' }}>
                  Error
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {errorMessage}
                </p>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full btn-primary py-3 text-base font-semibold gap-2"
            >
              <i className="fas fa-rotate-left" />
              Try Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

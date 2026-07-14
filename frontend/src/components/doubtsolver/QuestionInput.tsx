import { useState } from 'react';

interface Props {
  question: string;
  onQuestionChange: (q: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  recentQuestions: string[];
  onSelectRecent: (q: string) => void;
}

export default function QuestionInput({
  question,
  onQuestionChange,
  onSubmit,
  isLoading,
  recentQuestions,
  onSelectRecent,
}: Props) {
  const [focused, setFocused] = useState(false);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading) {
      onSubmit();
    }
  };

  const isValid = question.trim().length >= 5 && question.length <= 300;

  return (
    <div className="space-y-4">
      {/* Help text with examples */}
      <div
        className="px-4 py-3 rounded-lg text-sm"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <p className="mb-2 font-medium">Examples:</p>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <li>• "What is a hash table?"</li>
          <li>• "Explain OS deadlock"</li>
          <li>• "Difference between REST and GraphQL"</li>
          <li>• "How does a binary search tree work?"</li>
        </ul>
      </div>

      {/* Textarea input */}
      <div
        className="rounded-xl overflow-hidden border-2 transition-all"
        style={{
          borderColor: focused ? 'var(--accent)' : 'var(--border)',
          boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
        }}
      >
        <textarea
          placeholder="Ask your question here... (Ctrl+Enter to submit)"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          disabled={isLoading}
          rows={4}
          className="w-full px-4 py-3 text-sm outline-none resize-none"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            cursor: isLoading ? 'not-allowed' : 'text',
            opacity: isLoading ? 0.6 : 1,
          }}
        />
      </div>

      {/* Character count */}
      <div
        className="text-xs text-right"
        style={{ color: question.length > 300 ? 'var(--danger)' : 'var(--text-muted)' }}
      >
        {question.length} / 300
      </div>

      {/* Recent questions */}
      {recentQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            <i className="fas fa-history mr-1" />
            Recent questions
          </p>
          <div className="flex flex-wrap gap-2">
            {recentQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onSelectRecent(q)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  hover: { opacity: 0.8 },
                }}
                title={q}
              >
                {q.length > 30 ? `${q.substring(0, 27)}...` : q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={isLoading || !isValid}
        className="w-full btn-primary py-3 text-base font-semibold gap-2"
        style={{
          opacity: isValid && !isLoading ? 1 : 0.6,
          cursor: isValid && !isLoading ? 'pointer' : 'not-allowed',
          boxShadow: isValid && !isLoading ? '0 0 20px rgba(79,70,229,0.35)' : undefined,
        }}
      >
        {isLoading ? (
          <>
            <i className="fas fa-spinner fa-spin" />
            Searching and synthesizing...
          </>
        ) : (
          <>
            <i className="fas fa-lightbulb" />
            Get Answer
          </>
        )}
      </button>
    </div>
  );
}

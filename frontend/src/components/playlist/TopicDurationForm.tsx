import { useState } from 'react';

interface Props {
  topic: string;
  durationHours: number;
  isLoading: boolean;
  onTopicChange: (t: string) => void;
  onDurationChange: (h: number) => void;
  onSubmit: () => void;
}

// Helper to extract duration from natural language
function extractDurationFromText(text: string): number {
  // Match patterns like "in 5 days", "in 2 weeks", "in 3 hours", "in 1 month"
  const patterns = [
    { regex: /in\s+(\d+(?:\.\d+)?)\s*(?:hour|hr|h)s?/gi, multiplier: 1 },
    { regex: /in\s+(\d+(?:\.\d+)?)\s*(?:day|d)s?/gi, multiplier: 24 },
    { regex: /in\s+(\d+(?:\.\d+)?)\s*(?:week|w)s?/gi, multiplier: 24 * 7 },
    { regex: /in\s+(\d+(?:\.\d+)?)\s*(?:month|m)s?/gi, multiplier: 24 * 30 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = regex.exec(text);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        return value * multiplier;
      }
    }
  }

  return 0; // No duration found
}

export default function TopicDurationForm({
  topic,
  durationHours,
  isLoading,
  onTopicChange,
  onDurationChange,
  onSubmit,
}: Props) {
  const [focused, setFocused] = useState(false);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && topic.trim()) onSubmit();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onTopicChange(text);

    // Extract duration from the text
    const extractedHours = extractDurationFromText(text);
    if (extractedHours > 0) {
      onDurationChange(extractedHours);
    }
  };

  // Extract and display detected duration
  const detectedHours = extractDurationFromText(topic);
  const getDurationDisplay = () => {
    if (detectedHours === 0) return null;
    if (detectedHours < 24) return `${detectedHours} hours`;
    if (detectedHours < 24 * 7) return `${Math.round(detectedHours / 24)} days`;
    if (detectedHours < 24 * 30) return `${Math.round(detectedHours / (24 * 7))} weeks`;
    return `${Math.round(detectedHours / (24 * 30))} months`;
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero header */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 0 32px rgba(79,70,229,0.4)',
          }}
        >
          <i className="fas fa-route text-white text-2xl" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          AI Playlist Generator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Tell us your learning goal with a timeframe, and we'll build a structured YouTube
          learning playlist just for you.
        </p>
      </div>

      {/* Form card */}
      <div className="card space-y-6">
        {/* Main input - Natural language */}
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Enter a clear learning goal
          </label>

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
              <li>• "I want to learn Python basics in 3 days"</li>
              <li>• "I need to master data science in 2 weeks"</li>
              <li>• "Learn web development in 5 hours"</li>
              <li>• "Study cloud computing in 1 month"</li>
            </ul>
          </div>

          {/* Textarea input */}
          <textarea
            placeholder="e.g., I want to learn Python basics in 3 days"
            value={topic}
            onChange={handleTextChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKey}
            disabled={isLoading}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              background: 'var(--bg-elevated)',
              border: `2px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
              transition: 'all 0.2s',
              cursor: isLoading ? 'not-allowed' : 'text',
              opacity: isLoading ? 0.6 : 1,
            }}
          />

          {/* Detected duration feedback */}
          {detectedHours > 0 && (
            <div
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-fade-in"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              <i className="fas fa-check-circle" />
              <span>
                <strong>Duration detected:</strong> {getDurationDisplay()}
              </span>
            </div>
          )}

          {/* No duration warning */}
          {topic.trim() && detectedHours === 0 && (
            <div
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <i className="fas fa-info-circle" />
              <span>Include a timeframe like "in 3 days" or "in 2 weeks"</span>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          id="btn-generate-roadmap"
          onClick={onSubmit}
          disabled={isLoading || !topic.trim() || detectedHours === 0}
          className="btn-primary w-full py-3 text-base font-semibold gap-2"
          style={{
            boxShadow:
              topic.trim() && detectedHours > 0 ? '0 0 20px rgba(79,70,229,0.35)' : undefined,
            opacity: detectedHours === 0 ? 0.6 : 1,
            cursor: detectedHours === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin" />
              Generating roadmap…
            </>
          ) : (
            <>
              <i className="fas fa-wand-magic-sparkles" />
              Generate Learning Roadmap
            </>
          )}
        </button>
      </div>

      {/* Info section */}
      <div className="space-y-2">
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-lightbulb mr-1" style={{ color: 'var(--accent)' }} />
          The system automatically detects the duration from your goal. Be specific with timeframes
          for best results.
        </p>
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-check-circle mr-1" style={{ color: 'var(--accent)' }} />
          The roadmap is generated first — you can review and adjust it before we search YouTube.
        </p>
      </div>
    </div>
  );
}

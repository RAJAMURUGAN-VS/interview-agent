import { useState } from 'react';

interface Props {
  urls:        string[];
  onChange:    (urls: string[]) => void;
  disabled:    boolean;
  placeholder?: string;
}

export default function UrlInput({ urls, onChange, disabled, placeholder }: Props) {
  const [inputValue, setInputValue] = useState('');

  const addUrl = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    // Accept paste of multiple URLs separated by newlines or commas
    const newUrls = trimmed
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));
    onChange([...urls, ...newUrls.filter((u) => !urls.includes(u))]);
    setInputValue('');
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addUrl();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs uppercase tracking-widest text-[#8b8ba8]
        font-medium">
        Paste Website URLs
      </label>

      {/* URL textarea */}
      <div className="flex gap-2 items-start">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            placeholder || (
              `https://example.com/article\nhttps://docs.example.com/topic\n` +
              `(paste one or more URLs, one per line)`
            )
          }
          rows={3}
          className="flex-1 bg-[#1c1c27] border border-[#2a2a3d]
            focus:border-[#4f46e5] rounded-xl px-4 py-3 text-sm
            text-[#f0f0ff] placeholder-[#4a4a6a] resize-none outline-none
            transition-colors duration-200 disabled:opacity-40 font-mono"
        />
        <button
          onClick={addUrl}
          disabled={!inputValue.trim() || disabled}
          className="px-4 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
            text-white text-sm font-semibold transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <i className="fas fa-plus" />
        </button>
      </div>

      {/* Added URL chips */}
      {urls.length > 0 && (
        <div className="flex flex-col gap-2">
          {urls.map((url, i) => {
            const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
            return (
              <div key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg
                  bg-[#1c1c27] border border-[#2a2a3d] text-xs">
                <i className={isYoutube
                  ? 'fab fa-youtube text-[#ef4444] flex-shrink-0'
                  : 'fas fa-link text-[#4f46e5] flex-shrink-0'} />
                <span className="flex-1 text-[#8b8ba8] truncate">{url}</span>
                <button
                  onClick={() => removeUrl(i)}
                  disabled={disabled}
                  className="flex-shrink-0 text-[#4a4a6a] hover:text-[#ef4444]
                    transition-colors duration-150 disabled:opacity-40"
                  aria-label={`Remove ${url}`}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[#4a4a6a]">
        <i className="fas fa-info-circle mr-1" />
        Content will be extracted from each URL automatically.
        Invalid or inaccessible URLs will be skipped.
      </p>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  isStreamingActive: boolean;
  onComplete?: () => void;
}

export default function StreamingMarkdown({ content, isStreamingActive, onComplete }: Props) {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef(content);
  const onCompleteRef = useRef(onComplete);
  const hasStreamedRef = useRef(false);  // ← NEW: track if this message has already streamed
  const isStreamingRef = useRef(false);  // ← NEW: track if currently streaming

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // If not streaming, just show all content without animation
    if (!isStreamingActive) {
      setDisplayedText(content);
      isStreamingRef.current = false;
      return;
    }

    // If we've already streamed this message once, don't re-stream it
    if (hasStreamedRef.current) {
      setDisplayedText(content);
      return;
    }

    // Mark that we're now streaming this message
    isStreamingRef.current = true;
    hasStreamedRef.current = true;
    setDisplayedText('');
    let currentIdx = 0;
    const textToStream = content;

    intervalRef.current = setInterval(() => {
      if (currentIdx >= textToStream.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setDisplayedText(textToStream);
        isStreamingRef.current = false;
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      } else {
        // Reveal 2 to 4 characters at a time to simulate token-by-token streaming
        const remaining = textToStream.length - currentIdx;
        const chunk = Math.min(Math.floor(Math.random() * 3) + 2, remaining);
        currentIdx += chunk;
        setDisplayedText(textToStream.substring(0, currentIdx));
      }
    }, 20);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content, isStreamingActive]);

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {displayedText}
      </ReactMarkdown>
      {isStreamingRef.current && displayedText.length < content.length && (
        <span className="streaming-cursor" aria-hidden="true" />
      )}
    </div>
  );
}

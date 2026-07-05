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

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isStreamingActive) {
      setDisplayedText(content);
      return;
    }

    setDisplayedText('');
    let currentIdx = 0;
    const textToStream = content;

    intervalRef.current = setInterval(() => {
      if (currentIdx >= textToStream.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setDisplayedText(textToStream);
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
      {isStreamingActive && displayedText.length < content.length && (
        <span className="streaming-cursor" aria-hidden="true" />
      )}
    </div>
  );
}

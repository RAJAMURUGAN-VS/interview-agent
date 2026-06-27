import { useState, useRef } from 'react';

export function useAudioStream() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  function playStream(response: Response, onComplete?: () => void) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setIsSpeaking(true);
    audio.play().catch(() => {});

    let sourceBuffer: SourceBuffer;
    const queue: Uint8Array[] = [];
    let isReady = false;

    mediaSource.addEventListener('sourceopen', () => {
      sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      isReady = true;
      while (queue.length > 0 && !sourceBuffer.updating) {
        sourceBuffer.appendBuffer(queue.shift()!);
      }
      sourceBuffer.addEventListener('updateend', () => {
        if (queue.length > 0 && !sourceBuffer.updating) {
          sourceBuffer.appendBuffer(queue.shift()!);
        }
      });
    });

    function processChunk({ done, value }: ReadableStreamReadResult<Uint8Array>): void {
      if (done) {
        if (mediaSource.readyState === 'open') {
          try { mediaSource.endOfStream(); } catch (_) {}
        }
        if (onComplete) onComplete();
        return;
      }
      const text = decoder.decode(value, { stream: true });
      text.split('\n').forEach((line) => {
        if (!line.trim()) return;
        try {
          const binary = atob(line);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          if (isReady && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(bytes);
          } else {
            queue.push(bytes);
          }
        } catch (e) {
          console.error('Base64 decode error:', e);
        }
      });
      reader.read().then(processChunk);
    }

    reader.read().then(processChunk);

    const cleanup = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
  }

  return { isSpeaking, playStream };
}

import { useState, useRef } from 'react';

export function useAudioStream() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  async function playStream(response: Response, onComplete?: () => void) {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);

    try {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const chunks: Uint8Array[] = [];

      // Read all base64 lines from the stream and decode to binary
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const binary = atob(trimmed);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            chunks.push(bytes);
          } catch (e) {
            console.error('Base64 decode error:', e);
          }
        }
      }

      // Combine all chunks into a single MP3 blob
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        if (onComplete) onComplete();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        if (onComplete) onComplete();
      };

      await audio.play();
    } catch (e) {
      console.error('Audio stream error:', e);
      setIsSpeaking(false);
      if (onComplete) onComplete();
    }
  }

  return { isSpeaking, playStream };
}

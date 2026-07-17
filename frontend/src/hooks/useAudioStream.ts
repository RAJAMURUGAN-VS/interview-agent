import { useState, useRef } from 'react';

export function useAudioStream() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canRepeat, setCanRepeat] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastDataUrlRef = useRef<string | null>(null);

  async function playStream(response: Response, onComplete?: () => void) {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);
    setIsPaused(false);

    try {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      // Collect all raw binary bytes decoded from base64 lines
      const allBytes: number[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const binary = atob(trimmed);
            for (let i = 0; i < binary.length; i++) {
              allBytes.push(binary.charCodeAt(i));
            }
          } catch (e) {
            console.error('Base64 decode error:', e);
          }
        }
      }

      if (allBytes.length === 0) {
        setIsSpeaking(false);
        setIsPaused(false);
        if (onComplete) onComplete();
        return;
      }

      // Convert to base64 data URL — avoids range request issues with blob URLs
      const uint8 = new Uint8Array(allBytes);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:audio/mpeg;base64,${base64}`;

      // Save for repeat
      lastDataUrlRef.current = dataUrl;
      setCanRepeat(false); // not yet — will be true after playback ends

      const audio = new Audio(dataUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCanRepeat(true);
        currentAudioRef.current = null;
        if (onComplete) onComplete();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setIsPaused(false);
        setCanRepeat(!!lastDataUrlRef.current);
        currentAudioRef.current = null;
        if (onComplete) onComplete();
      };

      await audio.play();
    } catch (e) {
      console.error('Audio stream error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
      if (onComplete) onComplete();
    }
  }

  function pauseAudio() {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      setIsPaused(true);
    }
  }

  function resumeAudio() {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play().catch(e => console.error("Error resuming audio:", e));
      setIsPaused(false);
    }
  }

  function stopAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }

  function repeatAudio() {
    if (!lastDataUrlRef.current || isSpeaking) return;
    // Stop any current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(true);
    setIsPaused(false);
    setCanRepeat(false);
    const audio = new Audio(lastDataUrlRef.current);
    currentAudioRef.current = audio;
    audio.onended = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCanRepeat(true);
      currentAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCanRepeat(true);
      currentAudioRef.current = null;
    };
    audio.play().catch(e => console.error('Repeat audio error:', e));
  }

  return {
    isSpeaking,
    isPaused,
    canRepeat,
    playStream,
    pauseAudio,
    resumeAudio,
    stopAudio,
    repeatAudio,
  };
}

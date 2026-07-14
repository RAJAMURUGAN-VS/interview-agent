import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RoadmapSection,
  PlaylistGenerationJob,
} from '../types';
import {
  generateRoadmap,
  getConnectionStatus,
  getGoogleAuthUrl,
  generatePlaylist,
  getPlaylistJobStatus,
  JobLostError,
} from '../api/playlistApi';

// ── Local-storage / session-storage keys ─────────────────────────────────
const LS_USER_ID_KEY = 'pp_external_user_id';
const SS_JOB_ID_KEY  = 'pp_playlist_job_id';

// ── App phase ─────────────────────────────────────────────────────────────
export type AppPhase =
  | 'setup'
  | 'roadmap_preview'
  | 'checking_connection'
  | 'connect_prompt'
  | 'generating'
  | 'complete'
  | 'error';

// ── Hook return shape ─────────────────────────────────────────────────────
export interface UsePlaylistGeneratorReturn {
  appPhase: AppPhase;
  topic: string;
  durationHours: number;
  roadmap: RoadmapSection[] | null;
  jobStatus: PlaylistGenerationJob | null;
  errorMessage: string | null;
  isLoadingRoadmap: boolean;
  externalUserId: string;

  setTopic: (t: string) => void;
  setDurationHours: (h: number) => void;

  handleGenerateRoadmap: () => Promise<void>;
  handleConfirmRoadmap: () => Promise<void>;
  handleRegenerate: () => void;
  handleConnect: (popupWindow?: Window | null) => Promise<void>;
  handleReset: () => void;
}

// ── Helper: get-or-create stable user ID ─────────────────────────────────
function getOrCreateUserId(): string {
  let id = localStorage.getItem(LS_USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_USER_ID_KEY, id);
  }
  return id;
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function usePlaylistGenerator(): UsePlaylistGeneratorReturn {
  const [appPhase, setAppPhase]           = useState<AppPhase>('setup');
  const [topic, setTopic]                 = useState('');
  const [durationHours, setDurationHours] = useState(5);
  const [roadmap, setRoadmap]             = useState<RoadmapSection[] | null>(null);
  const [jobStatus, setJobStatus]         = useState<PlaylistGenerationJob | null>(null);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);

  // Stable user ID (generated once, persisted in localStorage)
  const [externalUserId] = useState<string>(getOrCreateUserId);

  // Poll refs
  const jobPollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Value refs — always hold the latest state so async callbacks
  // (polling intervals) never read stale closure values
  const roadmapRef      = useRef<RoadmapSection[] | null>(null);
  const topicRef        = useRef<string>('');
  const durationHrsRef  = useRef<number>(5);
  roadmapRef.current     = roadmap;
  topicRef.current       = topic;
  durationHrsRef.current = durationHours;

  // ── On mount: detect Google OAuth callback (?yt_connected=true) ────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ytConnected = params.get('yt_connected');
    if (!ytConnected) return;

    // Remove the query param without a page reload
    window.history.replaceState({}, '', window.location.pathname);

    if (ytConnected === 'true') {
      // Connection succeeded — the connect polling will pick it up
      // or the user can click "I've connected" to poll immediately
      setAppPhase('connect_prompt');
    } else {
      setErrorMessage(`YouTube connection failed. Please try again.`);
      setAppPhase('error');
    }
  }, []);

  // ── On mount: resume an in-progress job ───────────────────────────────
  useEffect(() => {
    const savedJobId = sessionStorage.getItem(SS_JOB_ID_KEY);
    if (!savedJobId) return;
    setAppPhase('generating');
    startJobPolling(savedJobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopJobPolling();
      stopConnectPolling();
    };
  }, []);

  // ── Phase: Setup → Roadmap preview ───────────────────────────────────
  const handleGenerateRoadmap = useCallback(async () => {
    if (!topic.trim()) return;
    setIsLoadingRoadmap(true);
    setErrorMessage(null);
    try {
      const res = await generateRoadmap(topic.trim(), durationHours);
      if (!res.success || !res.roadmap) {
        throw new Error(res.error ?? 'Failed to generate roadmap');
      }
      setRoadmap(res.roadmap);
      setAppPhase('roadmap_preview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setAppPhase('error');
    } finally {
      setIsLoadingRoadmap(false);
    }
  }, [topic, durationHours]);

  // ── Phase: Roadmap preview → Check connection → Generate ─────────────
  const handleConfirmRoadmap = useCallback(async () => {
    if (!roadmapRef.current) return;
    setAppPhase('checking_connection');
    setErrorMessage(null);
    try {
      const status = await getConnectionStatus(externalUserId);
      if (status.connected) {
        await _kickOffGeneration();
      } else {
        setAppPhase('connect_prompt');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setAppPhase('error');
    }
  }, [externalUserId]);

  // ── Phase: Regenerate roadmap ─────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    setRoadmap(null);
    setErrorMessage(null);
    setAppPhase('setup');
  }, []);

  // ── Phase: Connect YouTube account (Google OAuth) ─────────────────────
  // The popup MUST be opened synchronously in the click handler (before any
  // await), then navigated to the real OAuth URL once the API responds.
  const handleConnect = useCallback(async (popupWindow?: Window | null) => {
    setErrorMessage(null);
    try {
      const res = await getGoogleAuthUrl(externalUserId);
      if (!res.success || !res.auth_url) {
        throw new Error(res.error ?? 'Failed to get Google auth URL');
      }

      if (popupWindow && !popupWindow.closed) {
        popupWindow.location.href = res.auth_url;
      } else {
        // Fallback: try a fresh window.open (may be blocked)
        const w = window.open(res.auth_url, 'yt_oauth', 'width=600,height=700,left=200,top=100');
        if (!w) {
          throw new Error(
            'Popup was blocked. Please allow popups for this site, then click Connect again.',
          );
        }
      }

      // Poll /connection-status until the OAuth completes (120 s max)
      startConnectPolling();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setAppPhase('error');
    }
  }, [externalUserId]);

  // ── Reset to initial state ────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopJobPolling();
    stopConnectPolling();
    sessionStorage.removeItem(SS_JOB_ID_KEY);
    setAppPhase('setup');
    setRoadmap(null);
    setJobStatus(null);
    setErrorMessage(null);
    setIsLoadingRoadmap(false);
  }, []);

  // ── Internal: start backend generation job ────────────────────────────
  async function _kickOffGeneration() {
    const currentRoadmap   = roadmapRef.current;
    const currentTopic     = topicRef.current;
    const currentDuration  = durationHrsRef.current;
    if (!currentRoadmap || !currentTopic.trim()) return;
    setAppPhase('generating');
    try {
      const res = await generatePlaylist({
        externalUserId,
        topic: currentTopic.trim(),
        durationHours: currentDuration,
        roadmap: currentRoadmap,
        privacy: 'public',
      });
      if (!res.success || !res.job_id) {
        throw new Error(res.error ?? 'Failed to start generation job');
      }
      sessionStorage.setItem(SS_JOB_ID_KEY, res.job_id);
      startJobPolling(res.job_id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setAppPhase('error');
    }
  }

  // ── Internal: poll /connection-status ────────────────────────────────
  function startConnectPolling() {
    stopConnectPolling();

    connectPollRef.current = setInterval(async () => {
      try {
        const status = await getConnectionStatus(externalUserId);
        if (status.connected) {
          stopConnectPolling();
          await _kickOffGeneration();
        }
      } catch {
        // swallow transient errors
      }
    }, 2000);

    // Hard 120-second timeout
    connectTimeoutRef.current = setTimeout(() => {
      stopConnectPolling();
      setErrorMessage('YouTube connection timed out. Please try again.');
      setAppPhase('error');
    }, 120_000);
  }

  function stopConnectPolling() {
    if (connectPollRef.current)    { clearInterval(connectPollRef.current);  connectPollRef.current    = null; }
    if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null; }
  }

  // ── Internal: poll /playlist/status ──────────────────────────────────
  function startJobPolling(jobId: string) {
    stopJobPolling();

    const poll = async () => {
      try {
        const status = await getPlaylistJobStatus(jobId);
        setJobStatus(status);

        if (status.phase === 'awaiting_connection') {
          setAppPhase('connect_prompt');
          stopJobPolling();
          startConnectPolling();
          return;
        }
        if (status.phase === 'complete') {
          stopJobPolling();
          sessionStorage.removeItem(SS_JOB_ID_KEY);
          setAppPhase('complete');
          return;
        }
        if (status.phase === 'error') {
          stopJobPolling();
          sessionStorage.removeItem(SS_JOB_ID_KEY);
          setErrorMessage(status.errorMessage ?? 'An unknown error occurred');
          setAppPhase('error');
        }
      } catch (err) {
        if (err instanceof JobLostError) {
          // Server restarted — job is gone from memory
          stopJobPolling();
          sessionStorage.removeItem(SS_JOB_ID_KEY);
          setErrorMessage(
            'The server restarted and the job was lost. Please try generating your playlist again.',
          );
          setAppPhase('error');
        }
        // Other transient errors: keep polling
      }
    };

    poll();
    jobPollRef.current = setInterval(poll, 2000);
  }

  function stopJobPolling() {
    if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null; }
  }

  return {
    appPhase,
    topic,
    durationHours,
    roadmap,
    jobStatus,
    errorMessage,
    isLoadingRoadmap,
    externalUserId,
    setTopic,
    setDurationHours,
    handleGenerateRoadmap,
    handleConfirmRoadmap,
    handleRegenerate,
    handleConnect,
    handleReset,
  };
}

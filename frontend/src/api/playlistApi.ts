import type {
  PlaylistRoadmapResponse,
  PlaylistConnectionStatusResponse,
  PlaylistConnectTokenResponse,
  PlaylistGenerateResponse,
  PlaylistGenerationJob,
  RoadmapSection,
  PlaylistPrivacy,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

/**
 * Generate a structured learning roadmap via the LLM.
 */
export async function generateRoadmap(
  topic: string,
  durationHours: number,
): Promise<PlaylistRoadmapResponse> {
  const res = await fetch(`${BASE}/playlist/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, duration_hours: durationHours }),
  });
  return res.json();
}

/**
 * Check whether the user has connected their YouTube account via Pipedream.
 */
export async function getConnectionStatus(
  externalUserId: string,
): Promise<PlaylistConnectionStatusResponse> {
  const res = await fetch(
    `${BASE}/playlist/connection-status?external_user_id=${encodeURIComponent(externalUserId)}`,
  );
  return res.json();
}

/**
 * Mint a short-lived Pipedream Connect URL for the given user.
 */
export async function createConnectToken(
  externalUserId: string,
): Promise<PlaylistConnectTokenResponse> {
  const res = await fetch(`${BASE}/playlist/connect-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ external_user_id: externalUserId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create connect token: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Get the Google OAuth URL to connect a YouTube account for write access.
 * The frontend opens this URL in a popup; after auth Google redirects to
 * /playlist/google-callback which stores the token and redirects to
 * /playlist?yt_connected=true (which the popup-close listener catches).
 */
export async function getGoogleAuthUrl(
  externalUserId: string,
): Promise<{ success: boolean; auth_url?: string; error?: string }> {
  const res = await fetch(
    `${BASE}/playlist/google-auth-url?external_user_id=${encodeURIComponent(externalUserId)}`,
  );
  return res.json();
}


/**
 * Start a background playlist generation job.
 */
export async function generatePlaylist(params: {
  externalUserId: string;
  topic: string;
  durationHours: number;
  roadmap: RoadmapSection[];
  privacy?: PlaylistPrivacy;
}): Promise<PlaylistGenerateResponse> {
  const res = await fetch(`${BASE}/playlist/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      external_user_id: params.externalUserId,
      topic: params.topic,
      duration_hours: params.durationHours,
      roadmap: params.roadmap,
      privacy: params.privacy ?? 'public',
    }),
  });
  return res.json();
}

/**
 * Poll job progress. Maps snake_case backend response to camelCase.
 * Throws a JobLostError on 404 (server restarted, job wiped from memory).
 */
export class JobLostError extends Error {
  constructor() {
    super('SERVER_RESTARTED');
    this.name = 'JobLostError';
  }
}

export async function getPlaylistJobStatus(jobId: string): Promise<PlaylistGenerationJob> {
  const res = await fetch(`${BASE}/playlist/status/${encodeURIComponent(jobId)}`);
  if (res.status === 404) throw new JobLostError();
  const data = await res.json();
  return {
    phase:                  data.phase,
    roadmap:                data.roadmap ?? undefined,
    selectedVideos:         data.selected_videos ?? undefined,
    targetDurationMinutes:  data.target_duration_minutes,
    actualDurationMinutes:  data.actual_duration_minutes ?? undefined,
    playlistUrl:            data.playlist_url ?? undefined,
    errorMessage:           data.error_message ?? undefined,
  };
}

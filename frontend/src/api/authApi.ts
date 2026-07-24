/**
 * authApi.ts — HTTP helpers for the three auth endpoints.
 *
 * All functions read VITE_API_URL from the environment so they respect
 * the same base URL as every other API file in this project.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  picture: string | null;
}

export interface GoogleSignInResponse {
  success: boolean;
  token: string;
  is_new_user: boolean;
  user: AuthUser;
}

/** Exchange a Google ID token for the app's session JWT. */
export async function googleSignIn(credential: string): Promise<GoogleSignInResponse> {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Auth failed (${res.status})`);
  }

  return res.json();
}

/** Fetch the current user's profile using the stored session JWT. */
export async function getCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Session invalid or expired.");
  }

  const data = await res.json();
  return data.user as AuthUser;
}

/** Best-effort logout call — server is stateless, but we call it anyway. */
export async function logoutRequest(token: string): Promise<void> {
  await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    // Silently ignore network errors — logout is always a client-side action first.
  });
}

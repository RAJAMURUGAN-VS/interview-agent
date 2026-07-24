/**
 * authStore.ts — Zustand store for authentication state.
 *
 * Kept separate from appStore.ts (interview/feedback state) so that
 * auth concerns don't bleed into feature state and vice versa.
 *
 * Session rehydration (reading the token from localStorage and calling
 * GET /auth/me to validate it) is handled by the useAuth hook on app mount.
 */

import { create } from "zustand";
import type { AuthUser } from "../api/authApi";

interface AuthStore {
  /** The authenticated user, or null when logged out. */
  user: AuthUser | null;
  /** True when a valid session has been confirmed. */
  isAuthenticated: boolean;
  /** The raw session JWT stored in localStorage. */
  authToken: string | null;
  /**
   * True while the app is checking localStorage on first load.
   * Prevents a brief flash of the login page for already-signed-in users.
   */
  isLoadingAuth: boolean;

  // Actions
  setUser: (user: AuthUser, token: string) => void;
  clearUser: () => void;
  setLoadingAuth: (loading: boolean) => void;
}

const TOKEN_KEY = "mentra_auth_token";

export const useAuthStore = create<AuthStore>((set) => ({
  user:            null,
  isAuthenticated: false,
  authToken:       null,
  isLoadingAuth:   true, // start loading until we check localStorage

  setUser: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, authToken: token, isAuthenticated: true, isLoadingAuth: false });
  },

  clearUser: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, authToken: null, isAuthenticated: false, isLoadingAuth: false });
  },

  setLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
}));

/** Helper to read the persisted token without subscribing to the store. */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

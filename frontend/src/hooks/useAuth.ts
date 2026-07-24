/**
 * useAuth.ts — central hook for all auth operations.
 *
 * On the first call (app mount) it:
 *   1. Reads the session JWT from localStorage.
 *   2. Calls GET /auth/me to validate it and rehydrate the user.
 *   3. If invalid / expired, clears the token and shows logged-out state.
 *
 * Exports:
 *   isAuthenticated, user, authToken, isLoadingAuth — read-only state
 *   signInWithGoogle(credential)  — called after the GIS button succeeds
 *   signOut()                     — clears state + navigates to /login
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser, googleSignIn, logoutRequest } from "../api/authApi";
import { getStoredToken, useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, isAuthenticated, authToken, isLoadingAuth, setUser, clearUser, setLoadingAuth } =
    useAuthStore();
  const navigate  = useNavigate();
  const rehydrated = useRef(false); // guard against double-effect in StrictMode

  // ── Session rehydration on app load ──────────────────────────────────────
  useEffect(() => {
    if (rehydrated.current) return;
    rehydrated.current = true;

    const token = getStoredToken();
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    getCurrentUser(token)
      .then((user) => setUser(user, token))
      .catch(() => clearUser());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign in with Google ───────────────────────────────────────────────────
  async function signInWithGoogle(credential: string): Promise<{ isNewUser: boolean }> {
    const data = await googleSignIn(credential);
    setUser(data.user, data.token);
    return { isNewUser: data.is_new_user };
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function signOut() {
    const token = authToken;
    clearUser();
    navigate("/login", { replace: true });
    if (token) {
      await logoutRequest(token); // best-effort, doesn't block navigation
    }
  }

  return {
    isAuthenticated,
    user,
    authToken,
    isLoadingAuth,
    signInWithGoogle,
    signOut,
  };
}

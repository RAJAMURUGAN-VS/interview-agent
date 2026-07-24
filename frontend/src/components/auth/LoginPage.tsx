/**
 * LoginPage.tsx — full-screen Google Sign-In page for Mentra.
 *
 * Design system compliance:
 *   - Uses all existing CSS custom properties (--bg-page, --accent, etc.)
 *   - .card pattern identical to other features
 *   - .animate-fade-in for mount transition
 *   - Light/dark theme aware through CSS variables
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { GoogleSignInButton } from "./GoogleSignInButton";

export default function LoginPage() {
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [status,   setStatus]   = useState<"idle" | "loading" | "error">("idle");
  const [errMsg,   setErrMsg]   = useState("");
  const [toast,    setToast]    = useState<string | null>(null);

  // Already logged in → bounce to app immediately.
  if (isAuthenticated) {
    navigate("/interview", { replace: true });
    return null;
  }

  async function handleGoogleSuccess(credential: string) {
    setStatus("loading");
    setErrMsg("");
    try {
      const { isNewUser } = await signInWithGoogle(credential);
      // Show a brief toast, then navigate (navigate happens inside signInWithGoogle → useAuth).
      setToast(
        isNewUser
          ? "🎉 Welcome to Mentra! Let's get you placement-ready."
          : "👋 Welcome back! Good to see you again."
      );
      // Small delay so the user sees the toast, then the app loads.
      setTimeout(() => navigate("/interview", { replace: true }), 1200);
    } catch (err: unknown) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    }
  }

  function handleGoogleError() {
    setStatus("error");
    setErrMsg("Google sign-in was cancelled or failed. Please try again.");
  }

  return (
    <>
      {/* ── Page wrapper ─────────────────────────────────────────────── */}
      <div className="login-page-root animate-fade-in">

        {/* Ambient glow blobs */}
        <div className="login-glow login-glow--a" aria-hidden="true" />
        <div className="login-glow login-glow--b" aria-hidden="true" />

        {/* ── Card ──────────────────────────────────────────────────── */}
        <div className="login-card card">

          {/* Logo / Brand */}
          <div className="login-brand">
            <div className="login-logo" aria-label="Mentra logo">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="10" fill="var(--accent)" />
                <path
                  d="M8 26V10l10 8 10-8v16"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="login-brand-name">Mentra</span>
          </div>

          {/* Headline */}
          <h1 className="login-headline">
            Your AI-powered<br />
            <span className="login-headline-accent">placement coach</span>
          </h1>

          <p className="login-sub">
            Mock interviews · PDF chat · MCQs · Doubt solver · Prep plans — all in one place.
          </p>

          {/* Divider */}
          <div className="login-divider">
            <span>Sign in to get started</span>
          </div>

          {/* Google button or loading state */}
          {status === "loading" ? (
            <div className="login-loading">
              <div className="login-spinner" />
              <span>Signing you in…</span>
            </div>
          ) : (
            <div className="login-btn-wrap">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={status === "loading"}
              />
            </div>
          )}

          {/* Error message */}
          {status === "error" && errMsg && (
            <p className="login-error animate-fade-in" role="alert">
              ⚠️ {errMsg}
            </p>
          )}

          {/* Fine print */}
          <p className="login-legal">
            By signing in you agree that this is a hackathon demo. No passwords are
            stored — we only receive your public Google profile.
          </p>
        </div>

        {/* Feature pills */}
        <div className="login-pills animate-fade-in">
          {["🎤 AI Mock Interviews", "📄 PDF Chat", "🧠 MCQ Practice", "📚 Prep Plans", "💡 Doubt Solver"].map((f) => (
            <span key={f} className="login-pill">{f}</span>
          ))}
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="login-toast animate-fade-in" role="status">
          {toast}
        </div>
      )}

      {/* ── Scoped styles ─────────────────────────────────────────────── */}
      <style>{`
        .login-page-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 24px 16px;
          background: var(--bg-page);
          position: relative;
          overflow: hidden;
        }

        /* Ambient gradient blobs */
        .login-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .login-glow--a {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%);
          top: -80px;
          left: -80px;
        }
        .login-glow--b {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%);
          bottom: -60px;
          right: -60px;
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 36px 32px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(79,70,229,0.08),
            0 8px 32px rgba(0,0,0,0.24),
            0 0 60px var(--accent-glow);
          text-align: center;
        }

        /* Brand */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .login-logo {
          display: flex;
          align-items: center;
          filter: drop-shadow(0 0 8px var(--accent-glow));
        }
        .login-brand-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        /* Headline */
        .login-headline {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .login-headline-accent {
          background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Subtitle */
        .login-sub {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 300px;
        }

        /* Divider */
        .login-divider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .login-divider span {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
        }

        /* Google button wrapper */
        .login-btn-wrap {
          display: flex;
          justify-content: center;
        }

        /* Loading state */
        .login-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .login-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Error */
        .login-error {
          font-size: 0.8rem;
          color: var(--danger);
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          width: 100%;
          text-align: left;
        }

        /* Legal */
        .login-legal {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.5;
          max-width: 300px;
        }

        /* Feature pills */
        .login-pills {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          max-width: 480px;
        }
        .login-pill {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        /* Toast */
        .login-toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-elevated);
          border: 1px solid var(--border-highlight);
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 0.875rem;
          color: var(--text-primary);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 20px var(--accent-glow);
          z-index: 9999;
          white-space: nowrap;
        }

        /* Light theme adjustments */
        :root.light-theme .login-card {
          box-shadow:
            0 0 0 1px rgba(79,70,229,0.06),
            0 8px 32px rgba(0,0,0,0.10),
            0 0 40px rgba(79,70,229,0.08);
        }
        :root.light-theme .login-glow--a {
          background: radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%);
        }
        :root.light-theme .login-glow--b {
          background: radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%);
        }
      `}</style>
    </>
  );
}

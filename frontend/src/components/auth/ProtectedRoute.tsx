/**
 * ProtectedRoute.tsx — redirects unauthenticated users to /login.
 *
 * Shows a spinner while the session is being rehydrated (isLoadingAuth=true)
 * to prevent a flash of the login page for already-signed-in users.
 *
 * Usage (in App.tsx):
 *   <Route path="/some-feature" element={<ProtectedRoute><SomePage /></ProtectedRoute>} />
 */

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoadingAuth } = useAuthStore();

  if (isLoadingAuth) {
    return (
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "100vh",
          background:     "var(--bg-page)",
        }}
      >
        <div
          style={{
            width:        "40px",
            height:       "40px",
            border:       "3px solid var(--border)",
            borderTop:    "3px solid var(--accent)",
            borderRadius: "50%",
            animation:    "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

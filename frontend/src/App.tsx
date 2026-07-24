import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SectionCacheProvider } from './context/SectionCacheContext';
import { PdfChatProvider } from './context/PdfChatContext';
import { ThemeProvider } from './context/ThemeContext';
import InterviewPage from './pages/InterviewPage';
import NotesSubjectPage from './pages/NotesSubjectPage';
import PdfChatPage from './pages/PdfChatPage';
import McqPage from './components/mcq/McqPage';
import CodeFillPage from './components/codefill/CodeFillPage';
import InsightsPage from './components/insights/InsightsPage';
import PlaylistPage from './components/playlist/PlaylistPage';
import DoubtSolverPage from './components/doubtsolver/DoubtSolverPage';
import PrepPlanPage from './components/prepplan/PrepPlanPage';
import LoginPage from './components/auth/LoginPage';
import { useAuth } from './hooks/useAuth';
import './styles/theme.css';

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <i className="fas fa-spinner text-4xl" style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  return (
    <ThemeProvider>
      <SectionCacheProvider>
        <PdfChatProvider>
          <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-[#f0f0ff] transition-colors duration-300">
            {/* Show NavBar only when authenticated */}
            {isAuthenticated && <NavBar />}

            {/* Below the fixed navbar or full screen for login */}
            <main className={isAuthenticated ? "pt-16 min-h-screen flex flex-col" : "min-h-screen flex flex-col"}>
              <ErrorBoundary className="flex-1 flex flex-col">
                <Routes>
                  {/* Root - redirect to login or interview based on auth */}
                  <Route path="/" element={<Navigate to={isAuthenticated ? "/interview" : "/login"} replace />} />

                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Protected Interview routes */}
                  <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
                  <Route path="/interview/:subject" element={<ProtectedRoute><Navigate to="/interview" replace /></ProtectedRoute>} />
                  <Route path="/interview/:subject/feedback" element={<ProtectedRoute><Navigate to="/interview" replace /></ProtectedRoute>} />

                  {/* Protected Notes routes */}
                  <Route path="/notes" element={<ProtectedRoute><Navigate to="/notes/os" replace /></ProtectedRoute>} />
                  <Route path="/notes/:subject" element={<ProtectedRoute><NotesSubjectPage /></ProtectedRoute>} />

                  {/* Protected PDF Chat route */}
                  <Route path="/pdf-chat" element={<ProtectedRoute><PdfChatPage /></ProtectedRoute>} />

                  {/* Protected MCQ route */}
                  <Route path="/mcq" element={<ProtectedRoute><McqPage /></ProtectedRoute>} />

                  {/* Protected Code Fill route */}
                  <Route path="/codefill" element={<ProtectedRoute><CodeFillPage /></ProtectedRoute>} />

                  {/* Protected Insights route */}
                  <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />

                  {/* Protected Playlist route */}
                  <Route path="/playlist" element={<ProtectedRoute><PlaylistPage /></ProtectedRoute>} />

                  {/* Protected Doubt Solver route */}
                  <Route path="/doubt-solver" element={<ProtectedRoute><DoubtSolverPage /></ProtectedRoute>} />

                  {/* Protected Prep Plan route */}
                  <Route path="/prep-plan" element={<ProtectedRoute><PrepPlanPage /></ProtectedRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </PdfChatProvider>
      </SectionCacheProvider>
    </ThemeProvider>
  );
}

import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import NavBar from './components/layout/NavBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Pages
import WelcomePage from './pages/WelcomePage';
import InterviewPage from './pages/InterviewPage';
import FeedbackPage from './pages/FeedbackPage';
import NotesSubjectPage from './pages/NotesSubjectPage';
import type { AppTab } from './types';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive the active tab from the current path
  const activeTab: AppTab = location.pathname.startsWith('/notes') ? 'notes' : 'interview';

  function handleTabChange(tab: AppTab) {
    if (tab === 'notes') navigate('/notes');
    else navigate('/interview');
  }

  return (
    <AppShell>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
      <main>
        <ErrorBoundary>
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/interview" replace />} />

            {/* Interview routes */}
            <Route path="/interview" element={<WelcomePage />} />
            <Route path="/interview/os" element={<InterviewPage />} />
            <Route path="/interview/oop" element={<InterviewPage />} />
            <Route path="/interview/dbms" element={<InterviewPage />} />
            <Route path="/interview/cn" element={<InterviewPage />} />
            <Route path="/interview/:subject/feedback" element={<FeedbackPage />} />

            {/* Notes routes */}
            <Route path="/notes" element={<Navigate to="/notes/os" replace />} />
            <Route path="/notes/os" element={<NotesSubjectPage />} />
            <Route path="/notes/oop" element={<NotesSubjectPage />} />
            <Route path="/notes/dbms" element={<NotesSubjectPage />} />
            <Route path="/notes/cn" element={<NotesSubjectPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/interview" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </AppShell>
  );
}

export default function App() {
  return <AppContent />;
}

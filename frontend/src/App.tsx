import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import WelcomePage from './pages/WelcomePage';
import InterviewPage from './pages/InterviewPage';
import FeedbackPage from './pages/FeedbackPage';
import NotesSubjectPage from './pages/NotesSubjectPage';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavBar />

      {/* Below the fixed navbar */}
      <main className="pt-16 min-h-screen overflow-y-auto">
        <ErrorBoundary>
          <Routes>
            {/* Root */}
            <Route path="/" element={<Navigate to="/interview" replace />} />

            {/* Interview routes */}
            <Route path="/interview" element={<WelcomePage />} />
            <Route path="/interview/:subject" element={<InterviewPage />} />
            <Route path="/interview/:subject/feedback" element={<FeedbackPage />} />

            {/* Notes routes */}
            <Route path="/notes" element={<Navigate to="/notes/os" replace />} />
            <Route path="/notes/:subject" element={<NotesSubjectPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/interview" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

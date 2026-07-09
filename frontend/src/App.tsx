import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import InterviewPage from './pages/InterviewPage';
import NotesSubjectPage from './pages/NotesSubjectPage';
import PdfChatPage from './pages/PdfChatPage';
import McqPage from './components/mcq/McqPage';
import CodeFillPage from './components/codefill/CodeFillPage';

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
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/interview/:subject" element={<Navigate to="/interview" replace />} />
            <Route path="/interview/:subject/feedback" element={<Navigate to="/interview" replace />} />

            {/* Notes routes */}
            <Route path="/notes" element={<Navigate to="/notes/os" replace />} />
            <Route path="/notes/:subject" element={<NotesSubjectPage />} />

            {/* PDF Chat route */}
            <Route path="/pdf-chat" element={<PdfChatPage />} />

            {/* MCQ route */}
            <Route path="/mcq" element={<McqPage />} />

            {/* Code Fill route */}
            <Route path="/codefill" element={<CodeFillPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/interview" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

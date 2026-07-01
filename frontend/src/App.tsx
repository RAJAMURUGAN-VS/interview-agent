import { Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import InterviewPage from './pages/InterviewPage';
import FeedbackPage from './pages/FeedbackPage';

export default function App() {
  return (
    <div className="bg-black min-h-screen text-white font-inter">
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/interview/:subject" element={<InterviewPage />} />
        <Route path="/interview/:subject/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

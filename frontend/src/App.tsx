import { useAppStore } from './store/appStore';
import { useInterview } from './hooks/useInterview';
import AppShell from './components/layout/AppShell';
import NavBar from './components/layout/NavBar';
import InterviewPanel from './components/interview/InterviewPanel';
import NotesPage from './components/notes/NotesPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

export default function App() {
  const { activeTab, setTab } = useAppStore();
  const interview = useInterview();

  return (
    <AppShell>
      <NavBar activeTab={activeTab} onTabChange={setTab} />
      <main>
        {activeTab === 'interview' && (
          <ErrorBoundary>
            <InterviewPanel {...interview} />
          </ErrorBoundary>
        )}
        {activeTab === 'notes' && (
          <ErrorBoundary>
            <NotesPage />
          </ErrorBoundary>
        )}
      </main>
    </AppShell>
  );
}

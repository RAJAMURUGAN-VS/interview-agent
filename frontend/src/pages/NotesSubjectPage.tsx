import { useParams, Navigate } from 'react-router-dom';
import type { NotesSubject } from '../types';
import { PDF_PATHS, NOTES_SUBJECT_LABELS } from '../utils/pdfConfig';
import SubjectTabs from '../components/notes/SubjectTabs';
import PdfViewer from '../components/notes/PdfViewer';
import { useNavigate } from 'react-router-dom';

const SLUG_TO_NOTES: Record<string, NotesSubject> = {
  os:   'OS',
  oop:  'OOP',
  dbms: 'DBMS',
  cn:   'CN',
};

const NOTES_TO_SLUG: Record<NotesSubject, string> = {
  OS:   'os',
  OOP:  'oop',
  DBMS: 'dbms',
  CN:   'cn',
};

export default function NotesSubjectPage() {
  const { subject: slugParam } = useParams<{ subject: string }>();
  const navigate = useNavigate();

  const activeSubject = slugParam ? SLUG_TO_NOTES[slugParam] : undefined;

  if (!activeSubject) return <Navigate to="/notes/os" replace />;

  function handleSelect(s: NotesSubject) {
    navigate(`/notes/${NOTES_TO_SLUG[s]}`);
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-2">
          Quick Revision
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          {NOTES_SUBJECT_LABELS[activeSubject]}
        </h1>
        <p className="text-sm text-[#8b8ba8]">
          Recap the most important topics before your interview
        </p>
      </div>

      {/* Subject tabs — clicking changes URL */}
      <div className="mb-6">
        <SubjectTabs activeSubject={activeSubject} onSelect={handleSelect} />
      </div>

      {/* PDF viewer — key forces remount on subject change */}
      <PdfViewer key={activeSubject} pdfPath={PDF_PATHS[activeSubject]} />
    </div>
  );
}

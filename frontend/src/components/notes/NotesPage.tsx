import { useState } from 'react';
import type { NotesSubject } from '../../types';
import { PDF_PATHS } from '../../utils/pdfConfig';
import SubjectTabs from './SubjectTabs';
import PdfViewer from './PdfViewer';

export default function NotesPage() {
  const [activeSubject, setActiveSubject] = useState<NotesSubject>('OS');

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 pt-24 pb-12">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5]
          font-medium mb-2">
          Quick Revision
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          Subject Notes
        </h1>
        <p className="text-sm text-[#8b8ba8]">
          Recap the most important topics before your interview
        </p>
      </div>

      {/* Subject tabs */}
      <div className="mb-6">
        <SubjectTabs activeSubject={activeSubject} onSelect={setActiveSubject} />
      </div>

      {/* PDF viewer — key forces remount on subject change */}
      <PdfViewer key={activeSubject} pdfPath={PDF_PATHS[activeSubject]} />
    </div>
  );
}

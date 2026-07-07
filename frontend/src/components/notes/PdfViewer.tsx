import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props { pdfPath: string; }

export default function PdfViewer({ pdfPath }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadError(false);
  }, []);

  const onLoadError = useCallback(() => {
    setLoadError(true);
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 card">
        <p className="text-[#8b8ba8] text-sm">
          Notes not available. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card p-4 overflow-y-auto"
      style={{ maxHeight: '80vh' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Document
        file={pdfPath}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <div className="flex items-center justify-center h-48">
            <p className="text-[#8b8ba8] text-sm">Loading notes…</p>
          </div>
        }
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => (
            <div
              key={i + 1}
              className="flex justify-center mb-3 last:mb-0"
            >
              <Page
                pageNumber={i + 1}
                width={Math.min(window.innerWidth - 80, 700)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))
        }
      </Document>
    </div>
  );
}

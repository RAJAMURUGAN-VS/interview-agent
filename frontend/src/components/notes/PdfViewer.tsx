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
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(false);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
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
    <div className="flex flex-col gap-4">
      {/* PDF canvas */}
      <div
        className="card p-4 flex justify-center overflow-auto"
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
          <Page
            pageNumber={pageNumber}
            width={Math.min(window.innerWidth - 80, 700)}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* Pagination */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
            className="px-4 py-2 rounded-lg border border-[#2a2a3d]
              text-sm text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            <i className="fas fa-chevron-left mr-2" />Prev
          </button>
          <span className="text-sm text-[#8b8ba8]">
            Page <span className="text-[#f0f0ff] font-medium">{pageNumber}</span>
            {' '}of{' '}
            <span className="text-[#f0f0ff] font-medium">{numPages}</span>
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            aria-label="Next page"
            className="px-4 py-2 rounded-lg border border-[#2a2a3d]
              text-sm text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            Next<i className="fas fa-chevron-right ml-2" />
          </button>
        </div>
      )}
    </div>
  );
}

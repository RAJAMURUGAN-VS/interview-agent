import { useRef } from 'react';
import type { UploadStage } from '../../api/pdfChatApi';

// User-friendly label for each backend stage
const STAGE_LABELS: Record<UploadStage, string> = {
  idle:          'Waiting…',
  starting:      'Getting your PDF ready…',
  reading:       'Reading your PDF…',
  organising:    'Organising content…',
  understanding: 'Understanding your document…',
  indexing:      'Making it searchable…',
  finalizing:    'Almost ready…',
  done:          'Ready to chat!',
  error:         'Something went wrong',
};

interface Props {
  onFileSelect:   (file: File) => void;
  isUploading:    boolean;
  uploadError:    string | null;
  fileName:       string | null;
  onReset:        () => void;
  // progress
  uploadStage?:   UploadStage;
  uploadMessage?: string;
  uploadPct?:     number;
}

export default function UploadArea({
  onFileSelect, isUploading, uploadError, fileName, onReset,
  uploadStage = 'idle', uploadMessage, uploadPct = 0,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
      onFileSelect(file);
    }
  };

  // ── Loaded state ────────────────────────────────────────────────────────
  if (fileName && !isUploading && !uploadError) {
    return (
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4f46e5]/10
            border border-[#4f46e5]/30 flex items-center justify-center">
            <i className="fas fa-file-pdf text-[#4f46e5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#f0f0ff] truncate max-w-xs">{fileName}</p>
            <p className="text-xs text-[#22c55e]">
              <i className="fas fa-circle-check mr-1" />Ready to chat
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#8b8ba8] hover:text-[#f0f0ff]
            border border-[#2a2a3d] hover:border-[#4f46e5]
            px-3 py-1.5 rounded-lg transition-all duration-200"
        >
          <i className="fas fa-arrow-up-from-bracket mr-1.5" />New PDF
        </button>
      </div>
    );
  }

  // ── Uploading / processing state ────────────────────────────────────────
  if (isUploading) {
    const label   = uploadMessage || STAGE_LABELS[uploadStage] || 'Processing…';
    const percent = Math.min(100, Math.max(0, uploadPct));

    return (
      <div className="card border border-[#2a2a3d] py-8 px-6">
        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
          {/* Animated icon */}
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-[#4f46e5]/20" />
            <div
              className="absolute inset-0 rounded-full border-2 border-t-[#4f46e5]
                border-r-[#4f46e5]/40 border-b-transparent border-l-transparent
                animate-spin"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-file-pdf text-[#4f46e5] text-lg" />
            </div>
          </div>

          {/* Stage label */}
          <div className="text-center">
            <p className="text-sm font-medium text-[#f0f0ff]">{label}</p>
            <p className="text-xs text-[#4a4a6a] mt-1">
              This may take a few minutes for large documents — please wait.
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-[#4a4a6a] mb-1.5">
              <span>{STAGE_LABELS[uploadStage]}</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#1c1c27] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]
                  rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {(['reading', 'organising', 'understanding', 'indexing'] as UploadStage[]).map((s) => {
              const stages: UploadStage[] = [
                'reading', 'organising', 'understanding', 'indexing', 'finalizing', 'done',
              ];
              const currentIdx = stages.indexOf(uploadStage);
              const thisIdx    = stages.indexOf(s);
              const done       = currentIdx > thisIdx;
              const active     = currentIdx === thisIdx;
              return (
                <span
                  key={s}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all
                    ${done
                      ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/5'
                      : active
                        ? 'border-[#4f46e5] text-[#a5b4fc] bg-[#4f46e5]/10'
                        : 'border-[#2a2a3d] text-[#4a4a6a]'
                    }`}
                >
                  {done && <i className="fas fa-check mr-1 text-[9px]" />}
                  {STAGE_LABELS[s].replace('…', '').replace(' your document', '')}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Idle / drop zone state ──────────────────────────────────────────────
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="card border-dashed border-[#2a2a3d] hover:border-[#4f46e5]
        cursor-pointer transition-all duration-200 text-center py-10
        hover:bg-[#1c1c27]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#1c1c27] border border-[#2a2a3d]
          flex items-center justify-center mx-auto">
          <i className="fas fa-file-arrow-up text-[#4f46e5] text-2xl" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f0f0ff] mb-1">Drop your PDF here</p>
          <p className="text-xs text-[#8b8ba8]">or click to browse — PDF files only</p>
        </div>
        {uploadError && (
          <p className="text-xs text-[#ef4444] mt-1">
            <i className="fas fa-circle-exclamation mr-1" />{uploadError}
          </p>
        )}
      </div>
    </div>
  );
}

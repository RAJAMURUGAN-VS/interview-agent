import { useRef } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
  fileName: string | null;
  onReset: () => void;
}

export default function UploadArea({
  onFileSelect, isUploading, uploadError, fileName, onReset,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  // Loaded state
  if (fileName && !isUploading && !uploadError) {
    return (
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4f46e5]/10
            border border-[#4f46e5]/30 flex items-center justify-center">
            <i className="fas fa-file-pdf text-[#4f46e5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#f0f0ff] truncate max-w-xs">
              {fileName}
            </p>
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

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#4f46e5]
            border-t-transparent animate-spin" />
          <p className="text-sm text-[#8b8ba8]">Processing PDF…</p>
          <p className="text-xs text-[#4a4a6a]">
            Building knowledge base, this may take a moment
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#1c1c27] border border-[#2a2a3d]
            flex items-center justify-center mx-auto">
            <i className="fas fa-file-arrow-up text-[#4f46e5] text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f0f0ff] mb-1">
              Drop your PDF here
            </p>
            <p className="text-xs text-[#8b8ba8]">
              or click to browse — PDF files only
            </p>
          </div>
          {uploadError && (
            <p className="text-xs text-[#ef4444] mt-1">
              <i className="fas fa-circle-exclamation mr-1" />{uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

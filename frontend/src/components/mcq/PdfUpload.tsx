import { useRef } from 'react';

interface Props {
  file: File | null;
  onFileSelect: (f: File) => void;
  disabled: boolean;
}

export default function PdfUpload({ file, onFileSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      e.target.value = '';
      onFileSelect(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') onFileSelect(f);
  };

  if (file) {
    return (
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#4f46e5]/10
          border border-[#4f46e5]/30 flex items-center justify-center">
          <i className="fas fa-file-pdf text-[#4f46e5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#f0f0ff] truncate">{file.name}</p>
          <p className="text-xs text-[#22c55e]">
            <i className="fas fa-circle-check mr-1" />Ready
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="text-xs text-[#8b8ba8] hover:text-[#f0f0ff]
            border border-[#2a2a3d] hover:border-[#4f46e5]
            px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-40"
        >
          Change
        </button>
        <input ref={inputRef} type="file" accept="application/pdf"
          className="hidden" onChange={handleChange} />
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
      <input ref={inputRef} type="file" accept="application/pdf"
        className="hidden" onChange={handleChange} />
      <div className="w-12 h-12 rounded-xl bg-[#1c1c27] border border-[#2a2a3d]
        flex items-center justify-center mx-auto mb-3">
        <i className="fas fa-file-arrow-up text-[#4f46e5] text-xl" />
      </div>
      <p className="text-sm font-semibold text-[#f0f0ff] mb-1">Drop your PDF here</p>
      <p className="text-xs text-[#8b8ba8]">or click to browse</p>
    </div>
  );
}

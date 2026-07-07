import type { McqSourceType, McqQuestionType, McqQuestionCount } from '../../types';
import TextUpload    from './TextUpload';
import PdfUpload     from './PdfUpload';
import CustomisePanel from './CustomisePanel';

interface Props {
  sourceType:    McqSourceType;
  textContent:   string;
  pdfFile:       File | null;
  topic:         string;
  questionCount: McqQuestionCount;
  questionType:  McqQuestionType;
  isGenerating:  boolean;
  generateError: string | null;
  onSourceTypeChange: (v: McqSourceType) => void;
  onTextChange:       (v: string) => void;
  onPdfSelect:        (f: File) => void;
  onTopicChange:      (v: string) => void;
  onCountChange:      (v: McqQuestionCount) => void;
  onTypeChange:       (v: McqQuestionType) => void;
  onGenerate:         () => void;
}

export default function SetupPanel({
  sourceType, textContent, pdfFile, topic,
  questionCount, questionType, isGenerating, generateError,
  onSourceTypeChange, onTextChange, onPdfSelect,
  onTopicChange, onCountChange, onTypeChange, onGenerate,
}: Props) {
  const canGenerate = sourceType === 'text'
    ? textContent.trim().length >= 100
    : pdfFile !== null;

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Source type toggle */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Upload Your Notes
        </p>
        <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1
          border border-[#2a2a3d] w-fit mb-4">
          {([
            { value: 'text', label: 'Paste Text', icon: 'fas fa-keyboard' },
            { value: 'pdf',  label: 'Upload PDF', icon: 'fas fa-file-pdf' },
          ] as { value: McqSourceType; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSourceTypeChange(opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all duration-200
                ${sourceType === opt.value
                  ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                  : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
            >
              <i className={`${opt.icon} text-xs`} />
              {opt.label}
            </button>
          ))}
        </div>

        {sourceType === 'text'
          ? <TextUpload value={textContent} onChange={onTextChange} disabled={isGenerating} />
          : <PdfUpload  file={pdfFile}  onFileSelect={onPdfSelect} disabled={isGenerating} />}
      </div>

      {/* Customise panel */}
      <CustomisePanel
        topic={topic}
        questionCount={questionCount}
        questionType={questionType}
        onTopicChange={onTopicChange}
        onCountChange={onCountChange}
        onTypeChange={onTypeChange}
      />

      {/* Error */}
      {generateError && (
        <p className="text-sm text-[#ef4444] text-center">
          <i className="fas fa-circle-exclamation mr-2" />{generateError}
        </p>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
          text-white font-semibold text-sm transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
      >
        {isGenerating
          ? <><i className="fas fa-spinner fa-spin mr-2" />Generating Questions…</>
          : <><i className="fas fa-wand-magic-sparkles mr-2" />Generate Questions</>}
      </button>
    </div>
  );
}

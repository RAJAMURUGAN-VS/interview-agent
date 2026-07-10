import type { McqSourceType, McqQuestionType, McqQuestionCount, McqTimerConfig } from '../../types';
import TextUpload    from './TextUpload';
import PdfUpload     from './PdfUpload';
import UrlInput      from './UrlInput';
import CustomisePanel from './CustomisePanel';

interface Props {
  sourceType:    McqSourceType;
  textContent:   string;
  pdfFile:       File | null;
  topic:         string;
  urlList:       string[];
  questionCount: McqQuestionCount;
  questionType:  McqQuestionType;
  timerConfig:   McqTimerConfig;
  isGenerating:  boolean;
  generateError: string | null;
  failedUrls:    string[];
  onSourceTypeChange: (v: McqSourceType) => void;
  onTextChange:       (v: string) => void;
  onPdfSelect:        (f: File) => void;
  onTopicChange:      (v: string) => void;
  onUrlListChange:    (urls: string[]) => void;
  onCountChange:      (v: McqQuestionCount) => void;
  onTypeChange:       (v: McqQuestionType) => void;
  onTimerChange:      (patch: Partial<McqTimerConfig>) => void;
  onGenerate:         () => void;
}

export default function SetupPanel({
  sourceType, textContent, pdfFile, topic, urlList,
  questionCount, questionType, timerConfig, isGenerating, generateError, failedUrls,
  onSourceTypeChange, onTextChange, onPdfSelect, onTopicChange, onUrlListChange,
  onCountChange, onTypeChange, onTimerChange, onGenerate,
}: Props) {
  const canGenerate = sourceType === 'text'
    ? textContent.trim().length >= 100
    : sourceType === 'pdf'
    ? pdfFile !== null
    : sourceType === 'topic'
    ? topic.trim().length > 0
    : sourceType === 'url'
    ? urlList.length > 0
    : sourceType === 'youtube'
    ? urlList.length > 0
    : false;

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Source type toggle */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Upload Your Notes
        </p>
        <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1
          border border-[#2a2a3d] w-fit mb-4 flex-wrap">
          {([
            { value: 'text',  label: 'Paste Text', icon: 'fas fa-keyboard' },
            { value: 'pdf',   label: 'Upload PDF', icon: 'fas fa-file-pdf' },
            { value: 'topic', label: 'By Topic',   icon: 'fas fa-lightbulb' },
            { value: 'url',   label: 'From URL',   icon: 'fas fa-globe' },
            { value: 'youtube', label: 'YouTube',  icon: 'fab fa-youtube' },
          ] as { value: McqSourceType; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSourceTypeChange(opt.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                font-medium transition-all duration-200
                ${sourceType === opt.value
                  ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                  : 'text-[#8b8ba8] hover:text-[#f0f0ff]'}`}
            >
              <i className={`${opt.icon} text-xs ${opt.value === 'youtube' && sourceType === opt.value ? 'text-[#ef4444]' : ''}`} />
              {opt.label}
            </button>
          ))}
        </div>

        {sourceType === 'text'
          ? <TextUpload value={textContent} onChange={onTextChange} disabled={isGenerating} />
          : sourceType === 'pdf'
          ? <PdfUpload  file={pdfFile}  onFileSelect={onPdfSelect} disabled={isGenerating} />
          : sourceType === 'topic'
          ? <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-[#8b8ba8]
                font-medium">
                Topic Name
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                disabled={isGenerating}
                placeholder="e.g. Binary Search Trees, SQL Joins, OOP in Java…"
                className="bg-[#1c1c27] border border-[#2a2a3d] focus:border-[#4f46e5]
                  rounded-xl px-4 py-3 text-sm text-[#f0f0ff] placeholder-[#4a4a6a]
                  outline-none transition-colors duration-200 disabled:opacity-40"
              />
              <p className="text-xs text-[#4a4a6a]">
                <i className="fas fa-info-circle mr-1" />
                AI will generate questions from its own knowledge on this topic.
              </p>
            </div>
          : sourceType === 'url'
          ? <UrlInput
              urls={urlList}
              onChange={onUrlListChange}
              disabled={isGenerating}
            />
          : sourceType === 'youtube'
          ? <UrlInput
              urls={urlList}
              onChange={onUrlListChange}
              disabled={isGenerating}
              placeholder={
                `https://www.youtube.com/watch?v=VIDEO_ID\n` +
                `https://youtu.be/SHORT_ID\n` +
                `(paste one or more YouTube video URLs, one per line)`
              }
            />
          : null}
      </div>

      {/* Customise panel */}
      <CustomisePanel
        topic={topic}
        questionCount={questionCount}
        questionType={questionType}
        timerConfig={timerConfig}
        onTopicChange={onTopicChange}
        onCountChange={onCountChange}
        onTypeChange={onTypeChange}
        onTimerChange={onTimerChange}
      />

      {/* Error */}
      {generateError && (
        <p className="text-sm text-[#ef4444] text-center">
          <i className="fas fa-circle-exclamation mr-2" />{generateError}
        </p>
      )}

      {/* Failed URLs warning */}
      {failedUrls.length > 0 && (
        <div className="text-xs text-[#f59e0b] bg-[#f59e0b]/8
          border border-[#f59e0b]/20 rounded-xl px-4 py-3">
          <i className="fas fa-triangle-exclamation mr-2" />
          Could not extract content from {failedUrls.length} URL(s):
          <ul className="mt-1 ml-4 list-disc">
            {failedUrls.map((u) => (
              <li key={u} className="truncate">{u}</li>
            ))}
          </ul>
        </div>
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

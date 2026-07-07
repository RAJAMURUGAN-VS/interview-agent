import BlankInput from './BlankInput';
import type { CfBlankResult } from '../../types';

interface Props {
  codeTemplate:  string;
  userInputs:    string[];
  blankResults:  CfBlankResult[] | null;
  isAnswered:    boolean;
  isWrongShake:  boolean;
  disabled:      boolean;
  onInputChange: (index: number, value: string) => void;
  onSubmit:      () => void;
}

export default function CodeSnippet({
  codeTemplate, userInputs, blankResults,
  isAnswered, isWrongShake, disabled,
  onInputChange, onSubmit,
}: Props) {
  const getBlankStatus = (index: number): 'idle' | 'correct' | 'wrong' => {
    if (!blankResults) return 'idle';
    const result = blankResults[index];
    if (!result) return 'idle';
    return result.is_correct ? 'correct' : 'wrong';
  };

  // Split template into alternating text/blank segments
  const segments: { type: 'text' | 'blank'; content: string; index?: number }[] = [];
  const pattern = /____BLANK_(\d+)____/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(codeTemplate)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: codeTemplate.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'blank', content: match[0], index: parseInt(match[1], 10) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < codeTemplate.length) {
    segments.push({ type: 'text', content: codeTemplate.slice(lastIndex) });
  }

  return (
    <div
      className={`rounded-xl border border-[#2a2a3d] bg-[#0a0a0f]
        overflow-x-auto transition-all duration-150
        ${isWrongShake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
    >
      <pre className="p-4 sm:p-5 text-sm font-mono leading-7 whitespace-pre-wrap
        break-words text-[#c9d1d9]">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.content}</span>;
          }
          const idx = seg.index ?? 0;
          return (
            <BlankInput
              key={i}
              index={idx}
              value={userInputs[idx] ?? ''}
              status={isAnswered ? 'correct' : getBlankStatus(idx)}
              disabled={disabled || isAnswered}
              onChange={onInputChange}
              onEnter={onSubmit}
            />
          );
        })}
      </pre>
    </div>
  );
}

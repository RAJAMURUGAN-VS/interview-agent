import type { DepartmentKey } from '../../data/departmentSubjects';
import { DEPARTMENTS, getDepartmentByKey } from '../../data/departmentSubjects';

interface Props {
  selectedDeptKey: DepartmentKey;
  selectedSubjects: string[];
  customSubjectInput: string;
  onSelectDept: (key: DepartmentKey) => void;
  onToggleSubject: (subject: string) => void;
  onCustomInputChange: (v: string) => void;
  onCustomSubjectAdd: () => void;
  onCustomSubjectRemove: (subject: string) => void;
  onStart: () => void;
}

export default function InterviewSetup({
  selectedDeptKey,
  selectedSubjects,
  customSubjectInput,
  onSelectDept,
  onToggleSubject,
  onCustomInputChange,
  onCustomSubjectAdd,
  onCustomSubjectRemove,
  onStart,
}: Props) {
  const dept = getDepartmentByKey(selectedDeptKey);
  const presetSubjects = dept ? dept.subjects : [];
  const customSubjects = selectedSubjects.filter(
    (s) => !presetSubjects.includes(s) && s !== 'Self Introduction'
  );

  const canStart = selectedSubjects.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCustomSubjectAdd();
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Department Selector at Top */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
          Department
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#2a2a3d]">
          {DEPARTMENTS.map((d) => {
            const isSelected = selectedDeptKey === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onSelectDept(d.key)}
                className={`flex flex-col items-center justify-center gap-1
                  px-2 py-3 rounded-lg text-center transition-all duration-200
                  ${isSelected
                    ? 'bg-[#4f46e5] text-white shadow-[0_0_12px_rgba(79,70,229,0.3)] font-semibold'
                    : 'text-[#8b8ba8] hover:text-[#f0f0ff] hover:bg-[#1c1c27]'}`}
              >
                <i className={`${d.icon} text-sm ${isSelected ? 'text-white' : d.color}`} />
                <span className="text-[10px] font-medium">{d.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Subjects for chosen department */}
      {selectedDeptKey !== 'self-intro' && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
            Subjects
            <span className="ml-2 text-[#4a4a6a] normal-case tracking-normal">
              ({selectedSubjects.length} selected)
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            {presetSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => onToggleSubject(subject)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium
                    transition-all duration-200 touch-manipulation
                    ${isSelected
                      ? 'bg-[#4f46e5]/10 border-[#4f46e5] text-[#4f46e5]'
                      : 'bg-transparent border-[#2a2a3d] text-[#8b8ba8] hover:border-[#4f46e5] hover:text-[#f0f0ff] margins-none'}`}
                >
                  {isSelected && <i className="fas fa-check mr-1.5 text-[10px]" />}
                  {subject}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Subjects Selector */}
      {selectedDeptKey !== 'self-intro' && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8b8ba8] font-medium mb-3">
            Add Custom Subject
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSubjectInput}
              onChange={(e) => onCustomInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Embedded Systems, IoT, Blockchain…"
              className="flex-1 bg-[#1c1c27] border border-[#2a2a3d]
                focus:border-[#4f46e5] rounded-xl px-4 py-2 text-sm
                text-[#f0f0ff] placeholder-[#4a4a6a] outline-none
                transition-colors duration-200"
            />
            <button
              type="button"
              onClick={onCustomSubjectAdd}
              disabled={!customSubjectInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
                text-white text-sm font-semibold transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="fas fa-plus mr-1" />Add
            </button>
          </div>

          {customSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {customSubjects.map((subject) => (
                <span key={subject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-[#22c55e]/10 border border-[#22c55e]/30
                    text-[#22c55e] text-xs font-medium">
                  {subject}
                  <button
                    type="button"
                    onClick={() => onCustomSubjectRemove(subject)}
                    className="hover:text-white transition-colors duration-150"
                    aria-label={`Remove ${subject}`}
                  >
                    <i className="fas fa-times text-[10px]" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
          text-white font-semibold text-sm transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] mt-2"
      >
        <i className="fas fa-microphone mr-2" />Start Interview
      </button>
    </div>
  );
}

import { useState } from 'react';
import type { Department } from '../../data/departmentSubjects';

interface Props {
  department: Department;
  onSelect: (subject: string) => void;
  onBack: () => void;
}

export default function SubjectGrid({ department, onSelect, onBack }: Props) {
  const [customInput, setCustomInput] = useState('');

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddCustom();
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-24 pb-12">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-[#8b8ba8]
          hover:text-[#f0f0ff] transition-colors duration-200 mb-6"
      >
        <i className="fas fa-arrow-left" />
        Back to Departments
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-8 h-8 rounded-lg flex items-center
            justify-center ${department.bgColor} border ${department.borderColor}`}>
            <i className={`${department.icon} text-sm ${department.color}`} />
          </div>
          <p className={`text-sm font-semibold ${department.color}`}>
            {department.shortLabel}
          </p>
        </div>
        <h2 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          Choose a Subject
        </h2>
        <p className="text-sm text-[#8b8ba8]">
          Select one subject to begin your interview session with Natalie
        </p>
      </div>

      {/* Subject grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {department.subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => onSelect(subject)}
            className={`text-left p-4 rounded-xl border
              bg-[#13131a] border-[#2a2a3d]
              hover:${department.bgColor} hover:${department.borderColor}
              hover:bg-[#1c1c27]
              transition-all duration-200 group`}
            style={{}}
          >
            <div className="flex items-start gap-2.5">
              {/* Dept-colored dot */}
              <span className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full
                ${department.bgColor} border ${department.borderColor}`} />
              <span className="text-sm font-medium text-[#8b8ba8]
                group-hover:text-[#f0f0ff] transition-colors duration-200
                leading-snug">
                {subject}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom subject input */}
      <div className="card">
        <p className="text-xs uppercase tracking-widest text-[#4a4a6a]
          font-medium mb-3">
          <i className="fas fa-plus mr-1.5 text-[#4f46e5]" />
          Add Custom Subject
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Embedded Systems, IoT, Blockchain…"
            className="flex-1 bg-[#1c1c27] border border-[#2a2a3d]
              focus:border-[#4f46e5] rounded-xl px-4 py-2.5 text-sm
              text-[#f0f0ff] placeholder-[#4a4a6a] outline-none
              transition-colors duration-200"
          />
          <button
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca]
              text-white text-sm font-semibold transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start
          </button>
        </div>
        <p className="text-xs text-[#4a4a6a] mt-2">
          Type any subject and press Enter or click Start to begin immediately
        </p>
      </div>
    </div>
  );
}

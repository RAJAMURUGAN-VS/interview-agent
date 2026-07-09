import { DEPARTMENTS } from '../../data/departmentSubjects';
import type { DepartmentKey } from '../../data/departmentSubjects';

interface Props {
  onSelect: (key: DepartmentKey) => void;
}

export default function DepartmentSelector({ onSelect }: Props) {
  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-28 pb-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-widest
          text-[#4f46e5] mb-3">
          Mock Technical Interview
        </p>
        <h1 className="text-3xl font-bold text-[#f0f0ff] mb-3 tracking-tight">
          Select Your Department
        </h1>
        <p className="text-[#8b8ba8] text-sm max-w-sm mx-auto">
          Choose your engineering department to see the relevant
          core subjects for your placement interview
        </p>
      </div>

      {/* Department grid — 3 columns */}
      <div className="grid grid-cols-3 gap-4">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.key}
            onClick={() => onSelect(dept.key)}
            className={`relative text-left p-5 rounded-2xl border
              bg-[#13131a] border-[#2a2a3d]
              hover:border-[#4f46e5] hover:bg-[#1c1c27]
              transition-all duration-200 group`}
          >
            {/* Icon */}
            <div className={`text-2xl mb-3 ${dept.color}`}>
              <i className={dept.icon} />
            </div>

            {/* Short label */}
            <div className="font-bold text-[#f0f0ff] text-base mb-1">
              {dept.shortLabel}
            </div>

            {/* Full label */}
            <div className="text-xs text-[#4a4a6a] leading-tight
              group-hover:text-[#8b8ba8] transition-colors duration-200">
              {dept.label}
            </div>

            {/* Subject count badge — not shown for self-intro */}
            {dept.subjects.length > 0 && (
              <div className={`absolute top-3 right-3 text-[10px]
                font-semibold px-1.5 py-0.5 rounded-md
                ${dept.bgColor} ${dept.color}`}>
                {dept.subjects.length}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

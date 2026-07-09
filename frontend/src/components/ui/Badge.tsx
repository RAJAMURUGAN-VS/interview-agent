import { getDepartmentForSubject } from '../../data/departmentSubjects';

interface BadgeProps {
  subject: string;
}

// Fallback config when subject is not in any department (e.g. custom)
const FALLBACK = {
  icon: 'fas fa-graduation-cap',
  color: 'text-[#4f46e5]',
  bgColor: 'bg-[#4f46e5]/10',
  borderColor: 'border-[#4f46e5]',
};

// Special config for self-introduction
const SELF_INTRO_CONFIG = {
  icon: 'fas fa-user-tie',
  color: 'text-[#38bdf8]',
  bgColor: 'bg-[#38bdf8]/10',
  borderColor: 'border-[#38bdf8]',
};

export default function Badge({ subject }: BadgeProps) {
  // Self-introduction special case
  if (
    subject.toLowerCase().includes('self') ||
    subject.toLowerCase().includes('introduction')
  ) {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5
        rounded-lg border text-sm font-medium
        ${SELF_INTRO_CONFIG.bgColor}
        ${SELF_INTRO_CONFIG.borderColor}
        ${SELF_INTRO_CONFIG.color}`}>
        <i className={SELF_INTRO_CONFIG.icon} />
        {subject}
      </span>
    );
  }

  // Look up department for this subject
  const dept = getDepartmentForSubject(subject);
  const cfg = dept ?? FALLBACK;

  // Use dept icon if found; otherwise fallback icon
  const icon = dept?.icon ?? FALLBACK.icon;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5
      rounded-lg border text-sm font-medium
      ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
      <i className={icon} />
      {subject}
    </span>
  );
}

export { FALLBACK, SELF_INTRO_CONFIG };

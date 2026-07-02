import type { InterviewSubject } from '../../types';

const SUBJECT_CONFIG: Record<InterviewSubject, {
  icon: string; colorClass: string; bgClass: string; borderClass: string; short: string;
}> = {
  'Operating System': {
    icon: 'fas fa-microchip',
    colorClass: 'subject-os', bgClass: 'bg-os', borderClass: 'border-os',
    short: 'OS',
  },
  'Object Oriented Programming': {
    icon: 'fas fa-cube',
    colorClass: 'subject-oop', bgClass: 'bg-oop', borderClass: 'border-oop',
    short: 'OOP',
  },
  'Database Management System': {
    icon: 'fas fa-database',
    colorClass: 'subject-dbms', bgClass: 'bg-dbms', borderClass: 'border-dbms',
    short: 'DBMS',
  },
  'Computer Networks': {
    icon: 'fas fa-network-wired',
    colorClass: 'subject-cn', bgClass: 'bg-cn', borderClass: 'border-cn',
    short: 'CN',
  },
};

interface BadgeProps { subject: InterviewSubject; }

export default function Badge({ subject }: BadgeProps) {
  const cfg = SUBJECT_CONFIG[subject];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
      border text-sm font-medium ${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}`}>
      <i className={cfg.icon} />
      {subject}
    </span>
  );
}

export { SUBJECT_CONFIG };

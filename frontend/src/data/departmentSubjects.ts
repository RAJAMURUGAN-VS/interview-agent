export type DepartmentKey =
  | 'self-intro'
  | 'cse'
  | 'ece'
  | 'aiml'
  | 'it'
  | 'csbs';

export interface Department {
  key: DepartmentKey;
  label: string; // full name shown in heading
  shortLabel: string; // shown on department card
  icon: string; // Font Awesome class
  color: string; // Tailwind text color class
  bgColor: string; // Tailwind bg (low opacity)
  borderColor: string; // Tailwind border color class
  subjects: string[]; // empty for self-intro (special case)
}

export const DEPARTMENTS: Department[] = [
  {
    key: 'self-intro',
    label: 'Self Introduction',
    shortLabel: 'Self Intro',
    icon: 'fas fa-user-tie',
    color: 'text-[#38bdf8]',
    bgColor: 'bg-[#38bdf8]/10',
    borderColor: 'border-[#38bdf8]',
    subjects: [], // special case — no subject step
  },
  {
    key: 'cse',
    label: 'Computer Science & Engineering',
    shortLabel: 'CSE',
    icon: 'fas fa-laptop-code',
    color: 'text-[#4f46e5]',
    bgColor: 'bg-[#4f46e5]/10',
    borderColor: 'border-[#4f46e5]',
    subjects: [
      'Operating Systems',
      'Object Oriented Programming',
      'Database Management Systems',
      'Computer Networks',
      'Data Structures & Algorithms',
      'Software Engineering',
      'Theory of Computation',
      'Compiler Design',
      'Computer Organization & Architecture',
      'Discrete Mathematics',
    ],
  },
  {
    key: 'ece',
    label: 'Electronics & Communication Engineering',
    shortLabel: 'ECE',
    icon: 'fas fa-microchip',
    color: 'text-[#a855f7]',
    bgColor: 'bg-[#a855f7]/10',
    borderColor: 'border-[#a855f7]',
    subjects: [
      'Analog Electronics',
      'Digital Electronics',
      'Signals & Systems',
      'Communication Systems',
      'Electromagnetic Theory',
      'VLSI Design',
      'Microprocessors & Microcontrollers',
      'Control Systems',
      'Electronic Devices & Circuits',
      'Antenna & Wave Propagation',
    ],
  },
  {
    key: 'aiml',
    label: 'Artificial Intelligence & Machine Learning',
    shortLabel: 'AIML',
    icon: 'fas fa-brain',
    color: 'text-[#10b981]',
    bgColor: 'bg-[#10b981]/10',
    borderColor: 'border-[#10b981]',
    subjects: [
      'Machine Learning',
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Reinforcement Learning',
      'Data Science & Analytics',
      'Neural Networks',
      'AI Ethics & Fairness',
      'Big Data Technologies',
      'Statistics for ML',
    ],
  },
  {
    key: 'it',
    label: 'Information Technology',
    shortLabel: 'IT',
    icon: 'fas fa-globe',
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#f59e0b]/10',
    borderColor: 'border-[#f59e0b]',
    subjects: [
      'Web Technologies',
      'Cloud Computing',
      'Cybersecurity',
      'Network Administration',
      'Database Administration',
      'IT Project Management',
      'Mobile Application Development',
      'DevOps & CI/CD',
      'ERP Systems',
      'Information Systems Management',
    ],
  },
  {
    key: 'csbs',
    label: 'Computer Science & Business Systems',
    shortLabel: 'CSBS',
    icon: 'fas fa-chart-line',
    color: 'text-[#ef4444]',
    bgColor: 'bg-[#ef4444]/10',
    borderColor: 'border-[#ef4444]',
    subjects: [
      'Business Analytics',
      'Financial Technology (FinTech)',
      'Enterprise Resource Planning',
      'Supply Chain Management',
      'E-Commerce & Digital Marketing',
      'Business Intelligence',
      'Data Mining',
      'Business Communication',
      'Corporate Finance Basics',
      'Management Information Systems',
    ],
  },
];

/** Look up a Department by its key. Returns undefined if not found. */
export function getDepartmentByKey(key: DepartmentKey): Department | undefined {
  return DEPARTMENTS.find((d) => d.key === key);
}

/** Look up which department a given subject belongs to. */
export function getDepartmentForSubject(subject: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.subjects.includes(subject));
}

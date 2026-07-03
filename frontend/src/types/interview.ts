import type { InterviewSubject } from './index';

// URL slug <-> Subject mapping for the 4 CSE subjects
export const subjectSlugs: Record<string, InterviewSubject> = {
  'os':   'Operating System',
  'oop':  'Object Oriented Programming',
  'dbms': 'Database Management System',
  'cn':   'Computer Networks',
};

export function toSlug(subject: InterviewSubject): string {
  const map: Record<InterviewSubject, string> = {
    'Operating System':            'os',
    'Object Oriented Programming': 'oop',
    'Database Management System':  'dbms',
    'Computer Networks':           'cn',
  };
  return map[subject];
}

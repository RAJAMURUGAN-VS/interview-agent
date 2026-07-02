import type { InterviewSubject, NotesSubject } from '../types';

/** URL slug → full InterviewSubject name */
export const SLUG_TO_INTERVIEW_SUBJECT: Record<string, InterviewSubject> = {
  os:   'Operating System',
  oop:  'Object Oriented Programming',
  dbms: 'Database Management System',
  cn:   'Computer Networks',
};

/** Full InterviewSubject name → URL slug */
export const INTERVIEW_SUBJECT_TO_SLUG: Record<InterviewSubject, string> = {
  'Operating System':             'os',
  'Object Oriented Programming':  'oop',
  'Database Management System':   'dbms',
  'Computer Networks':            'cn',
};

/** URL slug → NotesSubject key */
export const SLUG_TO_NOTES_SUBJECT: Record<string, NotesSubject> = {
  os:   'OS',
  oop:  'OOP',
  dbms: 'DBMS',
  cn:   'CN',
};

/** NotesSubject key → URL slug */
export const NOTES_SUBJECT_TO_SLUG: Record<NotesSubject, string> = {
  OS:   'os',
  OOP:  'oop',
  DBMS: 'dbms',
  CN:   'cn',
};

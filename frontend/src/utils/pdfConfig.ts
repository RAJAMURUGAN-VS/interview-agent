import type { NotesSubject } from '../types';

export const PDF_PATHS: Record<NotesSubject, string> = {
  OS:   '/notes/os-notes.pdf',
  OOP:  '/notes/oop-notes.pdf',
  DBMS: '/notes/dbms-notes.pdf',
  CN:   '/notes/cn-notes.pdf',
};

export const NOTES_SUBJECT_LABELS: Record<NotesSubject, string> = {
  OS:   'Operating System',
  OOP:  'Object Oriented Programming',
  DBMS: 'Database Management System',
  CN:   'Computer Networks',
};

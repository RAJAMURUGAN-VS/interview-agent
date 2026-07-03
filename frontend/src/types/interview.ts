// Re-export everything from index so existing imports from 'types/interview' still work
export type {
  InterviewSubject,
  NotesSubject,
  AppTab,
  InterviewPhase,
  FeedbackData,
  SubmitAnswerMeta,
  FeedbackResponse,
} from './index';

// URL slug <-> Subject mapping for the CS core subjects
import type { InterviewSubject } from './index';

export const subjectSlugs: Record<string, InterviewSubject> = {
  os:   'Operating System',
  oop:  'Object Oriented Programming',
  dbms: 'Database Management System',
  cn:   'Computer Networks',
};

export function toSlug(subject: InterviewSubject): string {
  const slugMap: Record<InterviewSubject, string> = {
    'Operating System':             'os',
    'Object Oriented Programming':  'oop',
    'Database Management System':   'dbms',
    'Computer Networks':            'cn',
  };
  return slugMap[subject];
}

// Legacy Subject type alias kept for any remaining references
export type Subject = InterviewSubject;

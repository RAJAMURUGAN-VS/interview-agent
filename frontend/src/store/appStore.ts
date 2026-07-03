import { create } from 'zustand';
import type { InterviewSubject, FeedbackData } from '../types';

interface AppStore {
  currentSubject: InterviewSubject | null;
  feedbackData: FeedbackData | null;
  setSubject: (subject: InterviewSubject | null) => void;
  setFeedback: (data: FeedbackData | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentSubject: null,
  feedbackData: null,
  setSubject: (subject) => set({ currentSubject: subject }),
  setFeedback: (data) => set({ feedbackData: data }),
  reset: () => set({ currentSubject: null, feedbackData: null }),
}));

import { create } from 'zustand';
import type { Subject, FeedbackData } from '../types/interview';

interface InterviewStore {
  currentSubject: Subject | null;
  feedbackData: FeedbackData | null;
  setSubject: (subject: Subject | null) => void;
  setFeedback: (data: FeedbackData | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  currentSubject: null,
  feedbackData: null,
  setSubject: (subject) => set({ currentSubject: subject }),
  setFeedback: (data) => set({ feedbackData: data }),
  reset: () => set({ currentSubject: null, feedbackData: null }),
}));

import { create } from 'zustand';
import type { AppTab, InterviewSubject, FeedbackData } from '../types';

interface AppStore {
  activeTab: AppTab;
  currentSubject: InterviewSubject | null;
  feedbackData: FeedbackData | null;
  setTab: (tab: AppTab) => void;
  setSubject: (subject: InterviewSubject | null) => void;
  setFeedback: (data: FeedbackData | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 'interview',
  currentSubject: null,
  feedbackData: null,
  setTab: (tab) => set({ activeTab: tab }),
  setSubject: (subject) => set({ currentSubject: subject }),
  setFeedback: (data) => set({ feedbackData: data }),
  reset: () => set({ currentSubject: null, feedbackData: null }),
}));

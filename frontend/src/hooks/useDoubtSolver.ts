import { useState, useCallback, useEffect } from 'react';
import type { DoubtSolverResult } from '../types';
import { askDoubt } from '../api/doubtSolverApi';

const LS_HISTORY_KEY = 'doubt_solver_history';
const MAX_HISTORY = 5;

export interface UseDoubtSolverReturn {
  // State
  phase: 'idle' | 'loading' | 'answered' | 'error';
  question: string;
  result: DoubtSolverResult | null;
  errorMessage: string | null;
  recentQuestions: string[];

  // Actions
  setQuestion: (q: string) => void;
  submitQuestion: () => Promise<void>;
  selectRecent: (q: string) => Promise<void>;
  reset: () => void;
}

export function useDoubtSolver(): UseDoubtSolverReturn {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'answered' | 'error'>('idle');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<DoubtSolverResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  // Load recent questions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LS_HISTORY_KEY);
    if (saved) {
      try {
        setRecentQuestions(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent questions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(recentQuestions));
  }, [recentQuestions]);

  const addToHistory = useCallback((q: string) => {
    setRecentQuestions((prev) => {
      const normalized = q.trim().toLowerCase();
      const filtered = prev.filter((item) => item.trim().toLowerCase() !== normalized);
      return [q, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const submitQuestion = useCallback(async () => {
    const q = question.trim();
    if (!q || q.length < 5) {
      setErrorMessage('Question must be at least 5 characters');
      setPhase('error');
      return;
    }

    if (q.length > 300) {
      setErrorMessage('Question must be under 300 characters');
      setPhase('error');
      return;
    }

    setPhase('loading');
    setErrorMessage(null);

    try {
      const res = await askDoubt(q);
      setResult(res);
      setPhase('answered');
      addToHistory(q);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
      setPhase('error');
    }
  }, [question, addToHistory]);

  const selectRecent = useCallback(
    async (q: string) => {
      setQuestion(q);
      setPhase('loading');
      setErrorMessage(null);

      try {
        const res = await askDoubt(q);
        setResult(res);
        setPhase('answered');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
        setPhase('error');
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestion('');
    setResult(null);
    setErrorMessage(null);
  }, []);

  return {
    phase,
    question,
    result,
    errorMessage,
    recentQuestions,
    setQuestion,
    submitQuestion,
    selectRecent,
    reset,
  };
}

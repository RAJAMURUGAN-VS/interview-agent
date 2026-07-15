import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { DoubtSolverResult } from '../types';

/**
 * Cache for section state to persist across navigation.
 * Each section can store its state while switching between them.
 */

interface DoubtSolverCache {
  phase: 'idle' | 'loading' | 'answered' | 'error';
  question: string;
  result: DoubtSolverResult | null;
  errorMessage: string | null;
}

interface SectionCacheContextType {
  // Doubt Solver cache
  doubtSolverCache: DoubtSolverCache;
  setDoubtSolverCache: (cache: DoubtSolverCache) => void;
}

const SectionCacheContext = createContext<SectionCacheContextType | undefined>(undefined);

export function SectionCacheProvider({ children }: { children: ReactNode }) {
  const [doubtSolverCache, setDoubtSolverCache] = useState<DoubtSolverCache>({
    phase: 'idle',
    question: '',
    result: null,
    errorMessage: null,
  });

  return (
    <SectionCacheContext.Provider
      value={{
        doubtSolverCache,
        setDoubtSolverCache,
      }}
    >
      {children}
    </SectionCacheContext.Provider>
  );
}

export function useSectionCache() {
  const context = useContext(SectionCacheContext);
  if (!context) {
    throw new Error('useSectionCache must be used within SectionCacheProvider');
  }
  return context;
}

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  PrepPlanPhase,
  PrepPlan,
  PrepConfidence,
  PrepDay,
  PrepDayScore,
} from '../types';
import {
  generatePrepPlan,
  getCompanyStatus,
  getCachedCompanies,
} from '../api/prepPlanApi';

// ---------------------------------------------------------------------------
// Loading messages shown during Stage A and Stage B
// ---------------------------------------------------------------------------

const DISCOVERY_MESSAGES = [
  'Researching interview pattern…',
  'Analysing coding round topics…',
  'Checking aptitude requirements…',
  'Extracting topic weights…',
];

const BUILDING_MESSAGES = [
  'Building your schedule…',
  'Finding the best resources…',
  'Curating YouTube tutorials…',
  'Assembling your day-by-day plan…',
];

export function usePrepPlan() {
  // ── Phase machine ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<PrepPlanPhase>('setup');

  // ── Setup inputs ─────────────────────────────────────────────────────────
  const [companyInput, setCompanyInput] = useState('');
  const [days, setDays]                 = useState<number>(10);

  // ── Suggestions (autocomplete from cached companies) ─────────────────────
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Loading state ────────────────────────────────────────────────────────
  const [loadingMsg, setLoadingMsg]     = useState('');
  const [isCached, setIsCached]         = useState<boolean | null>(null);
  const loadingIntervalRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Result ───────────────────────────────────────────────────────────────
  const [plan, setPlan]                           = useState<PrepPlan | null>(null);
  const [companyConfidence, setCompanyConfidence] = useState<PrepConfidence | null>(null);
  const [activeDayIndex, setActiveDayIndex]       = useState(0);
  const [error, setError]                         = useState<string | null>(null);

  // ── Assessment scores — dayNumber → percentage ────────────────────────────
  const [dayScores, setDayScores] = useState<Record<number, number>>({});

  // ── Load cached company suggestions on mount ─────────────────────────────
  useEffect(() => {
    getCachedCompanies()
      .then((r) => setSuggestions(r.companies ?? []))
      .catch(() => setSuggestions([]));
  }, []);

  // ── Stop cycling messages on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, []);

  // ── Cycle through loading messages ───────────────────────────────────────
  const startLoadingCycle = useCallback(
    (messages: string[], intervalMs = 3500) => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      let i = 0;
      setLoadingMsg(messages[0]);
      loadingIntervalRef.current = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMsg(messages[i]);
      }, intervalMs);
    },
    []
  );

  const stopLoadingCycle = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  // ── Autocomplete: filter suggestions as the user types ──────────────────
  const filteredSuggestions =
    companyInput.trim().length > 0
      ? suggestions.filter((s) =>
          s.toLowerCase().includes(companyInput.toLowerCase())
        )
      : suggestions;

  // ── Generate plan ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!companyInput.trim()) return;

    setError(null);
    setPlan(null);
    setActiveDayIndex(0);

    // Quick status check to choose loading message set
    setPhase('discovering');
    try {
      const status = await getCompanyStatus(companyInput.trim());
      setIsCached(status.cached);

      if (status.cached) {
        // Cached — go straight to building
        startLoadingCycle(BUILDING_MESSAGES);
        setPhase('building');
      } else {
        // Cold — show discovery messages first
        startLoadingCycle(DISCOVERY_MESSAGES);
        // After ~8s switch to building messages (rough Stage A timing)
        setTimeout(() => {
          setPhase('building');
          startLoadingCycle(BUILDING_MESSAGES);
        }, 8000);
      }
    } catch {
      // Status check failed — just start with discovery messages
      startLoadingCycle(DISCOVERY_MESSAGES);
    }

    // Fire the actual (potentially slow) generate call
    try {
      const result = await generatePrepPlan({
        companyName: companyInput.trim(),
        days,
      });

      stopLoadingCycle();

      if (!result.success || !result.timeline) {
        setError(result.error ?? 'Failed to generate plan. Please try again.');
        setPhase('error');
        return;
      }

      setPlan({
        company:  result.company!,
        days:     result.days!,
        timeline: result.timeline,
      });
      setCompanyConfidence(result.company?.confidence ?? null);

      // Refresh suggestions in background
      getCachedCompanies()
        .then((r) => setSuggestions(r.companies ?? []))
        .catch(() => null);

      setPhase('plan');
    } catch {
      stopLoadingCycle();
      setError('Network error — is the backend running?');
      setPhase('error');
    }
  }, [companyInput, days, startLoadingCycle, stopLoadingCycle]);

  // ── Assessment complete handler ──────────────────────────────────────────
  const handleAssessmentComplete = useCallback(
    (result: Omit<PrepDayScore, 'completedAt'>) => {
      setDayScores((prev) => ({
        ...prev,
        [result.dayNumber]: result.percentage,
      }));
    },
    []
  );

  // ── Reset to setup ───────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopLoadingCycle();
    setPlan(null);
    setError(null);
    setActiveDayIndex(0);
    setCompanyConfidence(null);
    setIsCached(null);
    setCompanyInput('');
    setDays(10);
    setDayScores({});
    setPhase('setup');
  }, [stopLoadingCycle]);

  // ── Active day ───────────────────────────────────────────────────────────
  const activeDay: PrepDay | null = plan?.timeline[activeDayIndex] ?? null;

  return {
    // phase
    phase,

    // setup
    companyInput,   setCompanyInput,
    days,           setDays,

    // suggestions
    filteredSuggestions,
    showSuggestions,    setShowSuggestions,

    // loading
    loadingMsg,
    isCached,

    // plan
    plan,
    activeDay,
    activeDayIndex, setActiveDayIndex,
    companyConfidence,
    dayScores,

    // error
    error,

    // actions
    handleGenerate,
    handleReset,
    handleAssessmentComplete,
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  InsightsView,
  InsightsSubTab,
  InsightsModalStep,
  InsightsPostType,
  CompanySummary,
  CompanyDetail,
  ExperienceDraft,
  PreparationDraft,
  InsightsDepartment,
  InsightsOfferType,
  InsightsDifficulty,
  InsightsOutcome,
} from '../types';
import {
  getCompanies,
  getCompanyPosts,
  submitExperience,
  submitPreparation,
  upvotePost,
  reportPost,
} from '../api/insightsApi';

// ---------------------------------------------------------------------------
// Blank drafts
// ---------------------------------------------------------------------------

const BLANK_EXPERIENCE: ExperienceDraft = {
  company:    '',
  role:       '',
  department: '',
  offerType:  '',
  difficulty: null,
  outcome:    '',
  rounds:     [{ roundName: '', description: '' }],
  tips:       '',
};

const BLANK_PREPARATION: PreparationDraft = {
  company:           '',
  role:              '',
  department:        '',
  prepDurationWeeks: '',
  codingPlatforms:   [],
  studyMaterials:    [],
  youtubeChannels:   [],
  dailyRoutine:      '',
  advice:            '',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInsights() {
  // ── View state ────────────────────────────────────────────────────────────
  const [view, setView]                       = useState<InsightsView>('browse');
  const [activeCompany, setActiveCompany]     = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab]       = useState<InsightsSubTab>('experience');

  // ── Data ─────────────────────────────────────────────────────────────────
  const [companies, setCompanies]             = useState<CompanySummary[]>([]);
  const [companyDetail, setCompanyDetail]     = useState<CompanyDetail | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]         = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<CompanySummary[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Loading / error ───────────────────────────────────────────────────────
  const [isLoading, setIsLoading]             = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast]                     = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [modalStep, setModalStep]             = useState<InsightsModalStep>('type-pick');
  const [submissionType, setSubmissionType]   = useState<InsightsPostType | null>(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [submitError, setSubmitError]         = useState<string | null>(null);

  // ── Form drafts ───────────────────────────────────────────────────────────
  const [expDraft, setExpDraft]               = useState<ExperienceDraft>(BLANK_EXPERIENCE);
  const [prepDraft, setPrepDraft]             = useState<PreparationDraft>(BLANK_PREPARATION);

  // ── Tag input buffers (for list fields in prep form) ──────────────────────
  const [platformInput, setPlatformInput]     = useState('');
  const [materialInput, setMaterialInput]     = useState('');
  const [channelInput, setChannelInput]       = useState('');

  // ── Initial load ──────────────────────────────────────────────────────────
  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCompanies();
      setCompanies(data);
      setFilteredCompanies(data);
    } catch {
      setError('Could not load companies. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // ── Search: debounced client-side filter on loaded list ───────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredCompanies(companies);
        return;
      }
      const q = searchQuery.toLowerCase();
      setFilteredCompanies(
        companies.filter((c) => c.company.toLowerCase().includes(q))
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, companies]);

  // ── Navigate to company detail ────────────────────────────────────────────
  const openCompany = useCallback(async (company: string) => {
    setActiveCompany(company);
    setView('company-detail');
    setActiveSubTab('experience');
    setIsDetailLoading(true);
    setError(null);
    try {
      const data = await getCompanyPosts(company);
      setCompanyDetail(data);
    } catch {
      setError(`Could not load posts for ${company}.`);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const backToBrowse = useCallback(() => {
    setView('browse');
    setActiveCompany(null);
    setCompanyDetail(null);
    setError(null);
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openModal = useCallback((prefillCompany?: string) => {
    const company = prefillCompany ?? activeCompany ?? '';
    setExpDraft({ ...BLANK_EXPERIENCE, company });
    setPrepDraft({ ...BLANK_PREPARATION, company });
    setPlatformInput('');
    setMaterialInput('');
    setChannelInput('');
    setSubmissionType(null);
    setModalStep('type-pick');
    setSubmitError(null);
    setIsModalOpen(true);
  }, [activeCompany]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSubmitError(null);
  }, []);

  const pickType = useCallback((type: InsightsPostType) => {
    setSubmissionType(type);
    setModalStep('form');
  }, []);

  const backToTypePick = useCallback(() => {
    setModalStep('type-pick');
    setSubmitError(null);
  }, []);

  const shareAnother = useCallback(() => {
    const company = expDraft.company || prepDraft.company || activeCompany || '';
    setExpDraft({ ...BLANK_EXPERIENCE, company });
    setPrepDraft({ ...BLANK_PREPARATION, company });
    setPlatformInput('');
    setMaterialInput('');
    setChannelInput('');
    setSubmissionType(null);
    setModalStep('type-pick');
    setSubmitError(null);
  }, [expDraft.company, prepDraft.company, activeCompany]);

  // ── Experience draft helpers ──────────────────────────────────────────────
  const updateExp = useCallback(
    <K extends keyof ExperienceDraft>(key: K, value: ExperienceDraft[K]) =>
      setExpDraft((d) => ({ ...d, [key]: value })),
    []
  );

  const addRound = useCallback(() => {
    setExpDraft((d) => ({
      ...d,
      rounds: [...d.rounds, { roundName: '', description: '' }],
    }));
  }, []);

  const removeRound = useCallback((idx: number) => {
    setExpDraft((d) => ({
      ...d,
      rounds: d.rounds.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateRound = useCallback(
    (idx: number, key: 'roundName' | 'description', value: string) => {
      setExpDraft((d) => {
        const rounds = [...d.rounds];
        rounds[idx] = { ...rounds[idx], [key]: value };
        return { ...d, rounds };
      });
    },
    []
  );

  // ── Preparation draft helpers ─────────────────────────────────────────────
  const updatePrep = useCallback(
    <K extends keyof PreparationDraft>(key: K, value: PreparationDraft[K]) =>
      setPrepDraft((d) => ({ ...d, [key]: value })),
    []
  );

  const addTag = useCallback(
    (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', value: string) => {
      const tag = value.trim();
      if (!tag) return;
      setPrepDraft((d) => {
        if (d[field].includes(tag)) return d;
        return { ...d, [field]: [...d[field], tag] };
      });
    },
    []
  );

  const removeTag = useCallback(
    (field: 'codingPlatforms' | 'studyMaterials' | 'youtubeChannels', tag: string) => {
      setPrepDraft((d) => ({ ...d, [field]: d[field].filter((t) => t !== tag) }));
    },
    []
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let result;
      if (submissionType === 'experience') {
        result = await submitExperience(expDraft);
      } else {
        result = await submitPreparation(prepDraft);
      }

      if (!result.success) {
        setSubmitError(result.error ?? 'Submission failed. Please try again.');
        return;
      }

      setModalStep('success');

      // Refresh the current view
      if (activeCompany) {
        const company = submissionType === 'experience'
          ? expDraft.company
          : prepDraft.company;
        if (company === activeCompany) {
          // Silently refresh detail
          getCompanyPosts(company).then(setCompanyDetail).catch(() => null);
        }
      }
      // Refresh company list in background
      getCompanies().then((data) => {
        setCompanies(data);
        setFilteredCompanies(data);
      }).catch(() => null);

    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [submissionType, expDraft, prepDraft, activeCompany]);

  // ── Upvote ────────────────────────────────────────────────────────────────
  const handleUpvote = useCallback(
    async (postType: InsightsPostType, postId: string) => {
      try {
        const res = await upvotePost(postType, postId);
        if (res.success && companyDetail) {
          // Optimistically update count in-place
          setCompanyDetail((prev) => {
            if (!prev) return prev;
            if (postType === 'experience') {
              return {
                ...prev,
                experiences: prev.experiences.map((e) =>
                  e.id === postId ? { ...e, upvotes: res.upvotes ?? e.upvotes + 1 } : e
                ),
              };
            } else {
              return {
                ...prev,
                preparations: prev.preparations.map((p) =>
                  p.id === postId ? { ...p, upvotes: res.upvotes ?? p.upvotes + 1 } : p
                ),
              };
            }
          });
        }
      } catch {
        // silent — upvote is low-stakes
      }
    },
    [companyDetail]
  );

  // ── Report ────────────────────────────────────────────────────────────────
  const handleReport = useCallback(
    async (postType: InsightsPostType, postId: string) => {
      try {
        const res = await reportPost(postType, postId);
        if (res.success) {
          // Remove from local detail view immediately
          setCompanyDetail((prev) => {
            if (!prev) return prev;
            if (postType === 'experience') {
              return { ...prev, experiences: prev.experiences.filter((e) => e.id !== postId) };
            } else {
              return { ...prev, preparations: prev.preparations.filter((p) => p.id !== postId) };
            }
          });
          showToast('Post reported — it will be reviewed shortly.');
        }
      } catch {
        // silent
      }
    },
    [showToast]
  );

  return {
    // view
    view,
    activeCompany,
    activeSubTab,   setActiveSubTab,
    openCompany,
    backToBrowse,

    // data
    companies,
    filteredCompanies,
    companyDetail,

    // search
    searchQuery,    setSearchQuery,

    // loading / error
    isLoading,
    isDetailLoading,
    error,

    // toast
    toast,
    showToast,

    // modal
    isModalOpen,
    modalStep,
    submissionType,
    isSubmitting,
    submitError,
    openModal,
    closeModal,
    pickType,
    backToTypePick,
    shareAnother,

    // experience draft
    expDraft,
    updateExp: updateExp as (key: keyof ExperienceDraft, value: unknown) => void,
    addRound,
    removeRound,
    updateRound,

    // preparation draft
    prepDraft,
    updatePrep: updatePrep as (key: keyof PreparationDraft, value: unknown) => void,
    addTag,
    removeTag,
    platformInput,  setPlatformInput,
    materialInput,  setMaterialInput,
    channelInput,   setChannelInput,

    // actions
    handleSubmit,
    handleUpvote,
    handleReport,
  };
}

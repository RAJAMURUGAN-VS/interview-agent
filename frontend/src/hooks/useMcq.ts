import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  McqPhase, McqQuestion, McqAnswer, McqSessionConfig,
  McqFeedback, McqQuestionType, McqQuestionCount,
  McqSourceType, McqReviewFilter, McqTimerConfig, McqTimerMode,
  McqAnswerStatus, McqHistoryEntry,
} from '../types';
import { generateQuestions, fetchFeedback } from '../api/mcqApi';
import { saveMcqEntry } from './useHistory';

const DEFAULT_CONFIG: McqSessionConfig = {
  source_type:    'text',
  topic:          '',
  question_count: 10,
  question_type:  'mcq',
};

const DEFAULT_TIMER: McqTimerConfig = {
  mode:            'none',
  perQuestionSecs: 30,
  fullQuizMins:    10,
};

export function useMcq() {
  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<McqPhase>('setup');

  // ── Setup state ──────────────────────────────────────────────────────────
  const [config, setConfig]             = useState<McqSessionConfig>(DEFAULT_CONFIG);
  const [textContent, setTextContent]   = useState('');
  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [urlList, setUrlList]           = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [failedUrls, setFailedUrls]     = useState<string[]>([]);

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [questions, setQuestions]           = useState<McqQuestion[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [answers, setAnswers]               = useState<McqAnswer[]>([]);
  const [selectedLabel, setSelectedLabel]   = useState<string | null>(null);
  const [isAnswered, setIsAnswered]         = useState(false);
  const [fillInput, setFillInput]           = useState('');

  // ── Timer state ────────────────────────────────────────────────────────────
  const [timerConfig, setTimerConfig]       = useState<McqTimerConfig>(DEFAULT_TIMER);
  const [timeRemaining, setTimeRemaining]   = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartedRef = useRef(false);

  // ── Feedback state ───────────────────────────────────────────────────────
  const [feedback, setFeedback]                   = useState<McqFeedback | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [reviewFilter, setReviewFilter]           = useState<McqReviewFilter>('all');
  const [reportSaved, setReportSaved]             = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion  = currentIndex === questions.length - 1;

  // ── Config helpers ────────────────────────────────────────────────────────
  const setSourceType    = useCallback((v: McqSourceType) =>
    setConfig((c) => ({ ...c, source_type: v })), []);
  const setTopic         = useCallback((v: string) =>
    setConfig((c) => ({ ...c, topic: v })), []);
  const setQuestionCount = useCallback((v: McqQuestionCount) =>
    setConfig((c) => ({ ...c, question_count: v })), []);
  const setQuestionType  = useCallback((v: McqQuestionType) =>
    setConfig((c) => ({ ...c, question_type: v })), []);

  // ── Timer helpers ──────────────────────────────────────────────────────────
  const updateTimerConfig = useCallback(
    (patch: Partial<McqTimerConfig>) =>
      setTimerConfig((prev) => ({ ...prev, ...patch })),
    []
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
    timerStartedRef.current = false;
  }, []);

  const startPerQuestionTimer = useCallback(() => {
    if (timerConfig.mode !== 'per-question') return;
    stopTimer();
    setTimeRemaining(timerConfig.perQuestionSecs);
    setIsTimerRunning(true);
    timerStartedRef.current = true;
  }, [timerConfig, stopTimer]);

  const startFullQuizTimer = useCallback(() => {
    if (timerConfig.mode !== 'full-quiz') return;
    stopTimer();
    setTimeRemaining(timerConfig.fullQuizMins * 60);
    setIsTimerRunning(true);
    timerStartedRef.current = true;
  }, [timerConfig, stopTimer]);

  // ── Timer tick effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time is up — trigger auto-advance
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsTimerRunning(false);
          // handleTimerExpire will be called via separate callback
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // ── Extract triggerFeedback as a reusable internal function ────────────────
  const triggerFeedback = useCallback(async (allAnswers: McqAnswer[]) => {
    setPhase('feedback');
    setIsFeedbackLoading(true);
    const result = await fetchFeedback({
      questions,
      answers: allAnswers,
      topic:          config.topic ?? '',
      question_type:  config.question_type,
    });
    setIsFeedbackLoading(false);
    if (result.success && result.feedback) {
      setFeedback(result.feedback);
    }
  }, [questions, config]);

  // ── Handle timer expire ────────────────────────────────────────────────────
  const handleTimerExpire = useCallback(() => {
    if (timerConfig.mode === 'per-question') {
      // Record current question as timeout and advance
      if (!currentQuestion) return;
      const timeoutAnswer: McqAnswer = {
        question_id:    currentQuestion.id,
        selected_label: '',
        fill_input:     fillInput,
        is_correct:     false,
        status:         'timeout',
      };
      setAnswers((prev) => [...prev, timeoutAnswer]);
      setFillInput('');

      if (isLastQuestion) {
        triggerFeedback([...answers, timeoutAnswer]);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedLabel(null);
        setIsAnswered(false);
        // Start next question's timer
        setTimeout(() => startPerQuestionTimer(), 50);
      }
    } else if (timerConfig.mode === 'full-quiz') {
      // End entire quiz — record all remaining questions as timeout
      const remaining = questions.slice(answers.length);
      const timeoutAnswers: McqAnswer[] = remaining.map((q) => ({
        question_id:    q.id,
        selected_label: '',
        fill_input:     '',
        is_correct:     false,
        status:         'timeout',
      }));
      const allAnswers = [...answers, ...timeoutAnswers];
      setAnswers(allAnswers);
      triggerFeedback(allAnswers);
    }
  }, [
    timerConfig, currentQuestion, fillInput, answers,
    isLastQuestion, questions, startPerQuestionTimer, triggerFeedback,
  ]);

  // ── Monitor timeRemaining for expiry ───────────────────────────────────────
  useEffect(() => {
    if (timeRemaining === 0 && isTimerRunning === false && phase === 'quiz' && timerStartedRef.current) {
      // Timer just expired
      handleTimerExpire();
      timerStartedRef.current = false;
    }
  }, [timeRemaining, isTimerRunning, phase, handleTimerExpire]);

  // ── Generate questions ────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setFailedUrls([]);
    timerStartedRef.current = false;

    const result = await generateQuestions({
      source_type:    config.source_type,
      content:        config.source_type === 'text' ? textContent : undefined,
      pdfFile:        config.source_type === 'pdf'  ? pdfFile ?? undefined : undefined,
      topic:          config.topic,
      urls:           (config.source_type === 'url' || config.source_type === 'youtube')
                        ? urlList
                        : undefined,
      question_count: config.question_count,
      question_type:  config.question_type,
    });

    setIsGenerating(false);

    if (result.failed_urls?.length) {
      setFailedUrls(result.failed_urls);
    }

    if (result.success && result.questions?.length) {
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedLabel(null);
      setIsAnswered(false);
      setFillInput('');
      setPhase('quiz');

      // Start timer if configured
      if (timerConfig.mode === 'per-question') {
        setTimeout(() => startPerQuestionTimer(), 100);
      } else if (timerConfig.mode === 'full-quiz') {
        setTimeout(() => startFullQuizTimer(), 100);
      }
    } else {
      setGenerateError(result.error ?? 'Failed to generate questions.');
    }
  }, [config, textContent, pdfFile, urlList, timerConfig, startPerQuestionTimer, startFullQuizTimer]);

  // ── Select an answer option ───────────────────────────────────────────────
  const handleSelectOption = useCallback((label: string) => {
    if (isAnswered) return;

    setSelectedLabel(label);
    const correct = currentQuestion?.correct_label === label;

    setAnswers((prev) => [...prev, {
      question_id:    currentQuestion!.id,
      selected_label: label,
      fill_input:     '',
      is_correct:     correct,
      status:         'answered',
    }]);
    setIsAnswered(true);
  }, [isAnswered, currentQuestion]);

  // ── Next question ─────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!currentQuestion) return;
    stopTimer();

    const isCorrect = currentQuestion.type === 'fillup'
      ? fillInput.trim().toLowerCase() ===
        currentQuestion.correct_label.trim().toLowerCase()
      : selectedLabel === currentQuestion.correct_label;

    const answer: McqAnswer = {
      question_id:    currentQuestion.id,
      selected_label: selectedLabel ?? '',
      fill_input:     fillInput,
      is_correct:     isCorrect,
      status:         'answered',
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setFillInput('');

    if (isLastQuestion) {
      await triggerFeedback(newAnswers);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedLabel(null);
      setIsAnswered(false);
      if (timerConfig.mode === 'per-question') {
        setTimeout(() => startPerQuestionTimer(), 50);
      }
    }
  }, [
    currentQuestion, selectedLabel, fillInput, answers,
    isLastQuestion, stopTimer, timerConfig, triggerFeedback, startPerQuestionTimer,
  ]);

  // ── Retake same questions ─────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    stopTimer();
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFillInput('');
    setFeedback(null);
    setReviewFilter('all');
    setTimeRemaining(0);
    setIsTimerRunning(false);
    setReportSaved(false);
    setPhase('quiz');
    // Restart timer if configured
    if (timerConfig.mode === 'per-question') {
      setTimeout(() => startPerQuestionTimer(), 100);
    } else if (timerConfig.mode === 'full-quiz') {
      setTimeout(() => startFullQuizTimer(), 100);
    }
  }, [stopTimer, timerConfig, startPerQuestionTimer, startFullQuizTimer]);

  // ── New questions same topic ──────────────────────────────────────────────
  const handleNewSameTopic = useCallback(() => {
    stopTimer();
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFillInput('');
    setFeedback(null);
    setGenerateError(null);
    setReviewFilter('all');
    setFailedUrls([]);
    setUrlList([]);
    setReportSaved(false);
    setPhase('setup');
  }, [stopTimer]);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    stopTimer();
    setPhase('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFillInput('');
    setFeedback(null);
    setGenerateError(null);
    setReviewFilter('all');
    setTextContent('');
    setPdfFile(null);
    setUrlList([]);
    setFailedUrls([]);
    setTimeRemaining(0);
    setIsTimerRunning(false);
    setReportSaved(false);
    setConfig(DEFAULT_CONFIG);
  }, [stopTimer]);

  // ── Filtered answers for review ───────────────────────────────────────────
  const filteredAnswers = answers.filter((a) => {
    if (reviewFilter === 'correct') return a.is_correct;
    if (reviewFilter === 'wrong')   return !a.is_correct;
    return true;
  });

  const handleSaveMcqReport = useCallback(() => {
    if (!feedback || reportSaved) return;

    const topicLabel = config.topic?.trim()
      || config.source_type.charAt(0).toUpperCase() + config.source_type.slice(1);

    const entry: McqHistoryEntry = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      topic: topicLabel,
      sourceType: config.source_type,
      questionType: config.question_type,
      questionCount: questions.length,
      score: feedback.score,
      total: feedback.total,
      grade: feedback.grade,
      feedback,
      questions,
      answers,
    };

    saveMcqEntry(entry);
    setReportSaved(true);
  }, [feedback, reportSaved, config, questions, answers]);

  return {
    phase,
    config,
    textContent,     setTextContent,
    pdfFile,         setPdfFile,
    urlList,         setUrlList,
    isGenerating,    generateError,
    failedUrls,
    setSourceType,   setTopic, setQuestionCount, setQuestionType,
    handleGenerate,
    questions,
    currentQuestion,
    currentIndex,
    isLastQuestion,
    selectedLabel,
    isAnswered,
    fillInput,       setFillInput,
    handleSelectOption,
    handleNext,
    timerConfig,     updateTimerConfig,
    timeRemaining,   isTimerRunning,
    feedback,
    isFeedbackLoading,
    reviewFilter,    setReviewFilter,
    filteredAnswers,
    answers,
    handleRetake,
    handleNewSameTopic,
    handleEndSession,
    reportSaved,
    handleSaveMcqReport,
  };
}

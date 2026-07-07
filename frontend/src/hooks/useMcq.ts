import { useState, useCallback } from 'react';
import type {
  McqPhase, McqQuestion, McqAnswer, McqSessionConfig,
  McqFeedback, McqQuestionType, McqQuestionCount,
  McqSourceType, McqReviewFilter,
} from '../types';
import { generateQuestions, fetchFeedback } from '../api/mcqApi';

const DEFAULT_CONFIG: McqSessionConfig = {
  source_type:    'text',
  topic:          '',
  question_count: 10,
  question_type:  'mcq',
};

export function useMcq() {
  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<McqPhase>('setup');

  // ── Setup state ──────────────────────────────────────────────────────────
  const [config, setConfig]             = useState<McqSessionConfig>(DEFAULT_CONFIG);
  const [textContent, setTextContent]   = useState('');
  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [questions, setQuestions]           = useState<McqQuestion[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [answers, setAnswers]               = useState<McqAnswer[]>([]);
  const [selectedLabel, setSelectedLabel]   = useState<string | null>(null);
  const [isAnswered, setIsAnswered]         = useState(false);

  // ── Feedback state ───────────────────────────────────────────────────────
  const [feedback, setFeedback]                   = useState<McqFeedback | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [reviewFilter, setReviewFilter]           = useState<McqReviewFilter>('all');

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

  // ── Generate questions ────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);

    const result = await generateQuestions({
      source_type:    config.source_type,
      content:        config.source_type === 'text' ? textContent : undefined,
      pdfFile:        config.source_type === 'pdf'  ? pdfFile ?? undefined : undefined,
      topic:          config.topic,
      question_count: config.question_count,
      question_type:  config.question_type,
    });

    setIsGenerating(false);

    if (result.success && result.questions?.length) {
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedLabel(null);
      setIsAnswered(false);
      setPhase('quiz');
    } else {
      setGenerateError(result.error ?? 'Failed to generate questions.');
    }
  }, [config, textContent, pdfFile]);

  // ── Select an answer option ───────────────────────────────────────────────
  const handleSelectOption = useCallback((label: string) => {
    if (isAnswered) return;

    setSelectedLabel(label);
    const correct = currentQuestion?.correct_label === label;

    setAnswers((prev) => [...prev, {
      question_id:    currentQuestion!.id,
      selected_label: label,
      is_correct:     correct,
    }]);
    setIsAnswered(true);
  }, [isAnswered, currentQuestion]);

  // ── Next question ─────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (isLastQuestion) {
      setPhase('feedback');
      setIsFeedbackLoading(true);

      const currentAnswers = [...answers];
      const result = await fetchFeedback({
        questions,
        answers: currentAnswers,
        topic:         config.topic,
        question_type: config.question_type,
      });

      setIsFeedbackLoading(false);

      if (result.success && result.feedback) {
        setFeedback(result.feedback);
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedLabel(null);
      setIsAnswered(false);
    }
  }, [isLastQuestion, answers, questions, config]);

  // ── Retake same questions ─────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFeedback(null);
    setReviewFilter('all');
    setPhase('quiz');
  }, []);

  // ── New questions same topic ──────────────────────────────────────────────
  const handleNewSameTopic = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFeedback(null);
    setGenerateError(null);
    setReviewFilter('all');
    setPhase('setup');
  }, []);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedLabel(null);
    setIsAnswered(false);
    setFeedback(null);
    setGenerateError(null);
    setReviewFilter('all');
    setTextContent('');
    setPdfFile(null);
    setConfig(DEFAULT_CONFIG);
  }, []);

  // ── Filtered answers for review ───────────────────────────────────────────
  const filteredAnswers = answers.filter((a) => {
    if (reviewFilter === 'correct') return a.is_correct;
    if (reviewFilter === 'wrong')   return !a.is_correct;
    return true;
  });

  return {
    phase,
    config,
    textContent, setTextContent,
    pdfFile,     setPdfFile,
    isGenerating, generateError,
    setSourceType, setTopic, setQuestionCount, setQuestionType,
    handleGenerate,
    questions,
    currentQuestion,
    currentIndex,
    isLastQuestion,
    selectedLabel,
    isAnswered,
    handleSelectOption,
    handleNext,
    feedback,
    isFeedbackLoading,
    reviewFilter, setReviewFilter,
    filteredAnswers,
    answers,
    handleRetake,
    handleNewSameTopic,
    handleEndSession,
  };
}

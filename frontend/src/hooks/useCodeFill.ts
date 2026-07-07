import { useState, useCallback } from 'react';
import type {
  CfPhase, CfLanguage, CfCategory, CfQuestion,
  CfAnswerRecord, CfFeedback, CfBlankResult,
  CfSessionConfig, CfQuestionCount,
} from '../types';
import {
  generateCfQuestions,
  checkCfAnswer,
  fetchCfFeedback,
} from '../api/codeFillApi';

export const CP_TOPICS = [
  'if-else', 'for loop', 'while loop', 'do-while', 'switch',
  'arrays', 'strings', 'collections', 'matrix', 'recursion',
  'dynamic programming', 'graphs', 'trees', 'linked lists',
  'stacks', 'queues', 'sorting algorithms', 'searching algorithms',
  'two pointers', 'sliding window', 'bit manipulation',
  'greedy algorithms', 'backtracking', 'hashing',
];

export const OOP_TOPICS = [
  'classes and objects', 'constructors', 'encapsulation',
  'abstraction', 'inheritance', 'polymorphism', 'interfaces',
  'static members', 'final/const', 'access modifiers',
  'method overloading', 'method overriding',
  'abstract classes', 'generics/templates',
  'exception handling', 'design patterns',
];

const DEFAULT_CONFIG: CfSessionConfig = {
  language:       'python',
  category:       'competitive programming',
  topics:         [],
  question_count: 10,
};

const MAX_ATTEMPTS = 3;

export function useCodeFill() {
  const [phase, setPhase] = useState<CfPhase>('setup');

  const [config, setConfig]                             = useState<CfSessionConfig>(DEFAULT_CONFIG);
  const [customTopicInput, setCustomTopicInput]         = useState('');
  const [isGenerating, setIsGenerating]                 = useState(false);
  const [generateError, setGenerateError]               = useState<string | null>(null);

  const [questions, setQuestions]                       = useState<CfQuestion[]>([]);
  const [currentIndex, setCurrentIndex]                 = useState(0);
  const [answerRecords, setAnswerRecords]               = useState<CfAnswerRecord[]>([]);

  const [userInputs, setUserInputs]                     = useState<string[]>([]);
  const [attempts, setAttempts]                         = useState(0);
  const [hintUsed, setHintUsed]                         = useState(false);
  const [hintVisible, setHintVisible]                   = useState(false);
  const [isAnswered, setIsAnswered]                     = useState(false);
  const [isWrongShake, setIsWrongShake]                 = useState(false);
  const [blankResults, setBlankResults]                 = useState<CfBlankResult[] | null>(null);
  const [isChecking, setIsChecking]                     = useState(false);

  const [feedback, setFeedback]                         = useState<CfFeedback | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading]       = useState(false);
  const [reviewOpenId, setReviewOpenId]                 = useState<string | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion  = currentIndex === questions.length - 1;
  const hintUnlocked    = attempts >= MAX_ATTEMPTS;
  const progress        = questions.length
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;

  const setLanguage = useCallback(
    (v: CfLanguage) => setConfig((c) => ({ ...c, language: v })), []);

  const setCategory = useCallback(
    (v: CfCategory) => setConfig((c) => ({ ...c, category: v, topics: [] })), []);

  const setQuestionCount = useCallback(
    (v: CfQuestionCount) => setConfig((c) => ({ ...c, question_count: v })), []);

  const toggleTopic = useCallback((topic: string) => {
    setConfig((c) => ({
      ...c,
      topics: c.topics.includes(topic)
        ? c.topics.filter((t) => t !== topic)
        : [...c.topics, topic],
    }));
  }, []);

  const addCustomTopic = useCallback(() => {
    const t = customTopicInput.trim().toLowerCase();
    if (!t) return;
    setConfig((c) => ({
      ...c,
      topics: c.topics.includes(t) ? c.topics : [...c.topics, t],
    }));
    setCustomTopicInput('');
  }, [customTopicInput]);

  const removeCustomTopic = useCallback((topic: string) => {
    setConfig((c) => ({ ...c, topics: c.topics.filter((t) => t !== topic) }));
  }, []);

  const resetQuestionState = useCallback((blankCount: number) => {
    setUserInputs(Array(blankCount).fill(''));
    setAttempts(0);
    setHintUsed(false);
    setHintVisible(false);
    setIsAnswered(false);
    setIsWrongShake(false);
    setBlankResults(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (config.topics.length === 0) {
      setGenerateError('Select at least one topic.');
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);

    const result = await generateCfQuestions({
      language:       config.language,
      category:       config.category,
      topics:         config.topics,
      question_count: config.question_count,
    });

    setIsGenerating(false);

    if (result.success && result.questions?.length) {
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswerRecords([]);
      resetQuestionState(result.questions[0]?.blanks?.length ?? 1);
      setFeedback(null);
      setPhase('quiz');
    } else {
      setGenerateError(result.error ?? 'Failed to generate questions.');
    }
  }, [config, resetQuestionState]);

  const handleInputChange = useCallback((index: number, value: string) => {
    setUserInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || isAnswered || isChecking) return;

    setIsChecking(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const result = await checkCfAnswer({
      question:     currentQuestion,
      user_answers: userInputs,
    });

    setIsChecking(false);
    if (!result.success) return;

    setBlankResults(result.blank_results ?? null);

    if (result.all_correct) {
      setIsAnswered(true);
    } else {
      setIsWrongShake(true);
      setTimeout(() => setIsWrongShake(false), 600);
    }
  }, [currentQuestion, isAnswered, isChecking, attempts, userInputs]);

  const handleShowHint = useCallback(() => {
    setHintUsed(true);
    setHintVisible(true);
  }, []);

  const advanceOrFinish = useCallback(async (records: CfAnswerRecord[]) => {
    if (isLastQuestion) {
      setPhase('feedback');
      setIsFeedbackLoading(true);

      const result = await fetchCfFeedback({
        language:       config.language,
        category:       config.category,
        topics:         config.topics,
        questions,
        answer_records: records,
      });

      setIsFeedbackLoading(false);
      if (result.success && result.feedback) {
        setFeedback(result.feedback);
      }
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      resetQuestionState(questions[nextIndex]?.blanks?.length ?? 1);
    }
  }, [isLastQuestion, currentIndex, questions, config, resetQuestionState]);

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return;
    const record: CfAnswerRecord = {
      question_id:  currentQuestion.id,
      user_answers: userInputs,
      is_correct:   false,
      attempts,
      hint_used:    hintUsed,
      skipped:      true,
    };
    const newRecords = [...answerRecords, record];
    setAnswerRecords(newRecords);
    advanceOrFinish(newRecords);
  }, [currentQuestion, userInputs, attempts, hintUsed, answerRecords, advanceOrFinish]);

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    const record: CfAnswerRecord = {
      question_id:  currentQuestion.id,
      user_answers: userInputs,
      is_correct:   true,
      attempts,
      hint_used:    hintUsed,
      skipped:      false,
    };
    const newRecords = [...answerRecords, record];
    setAnswerRecords(newRecords);
    advanceOrFinish(newRecords);
  }, [currentQuestion, userInputs, attempts, hintUsed, answerRecords, advanceOrFinish]);

  const handleRetake = useCallback(() => {
    setCurrentIndex(0);
    setAnswerRecords([]);
    resetQuestionState(questions[0]?.blanks?.length ?? 1);
    setFeedback(null);
    setReviewOpenId(null);
    setPhase('quiz');
  }, [questions, resetQuestionState]);

  const handleNewQuestions = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswerRecords([]);
    setFeedback(null);
    setGenerateError(null);
    setReviewOpenId(null);
    setPhase('setup');
  }, []);

  const handleEndSession = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setAnswerRecords([]);
    setFeedback(null);
    setGenerateError(null);
    setReviewOpenId(null);
    setCustomTopicInput('');
    setConfig(DEFAULT_CONFIG);
    setUserInputs([]);
    setAttempts(0);
    setHintUsed(false);
    setHintVisible(false);
    setIsAnswered(false);
    setBlankResults(null);
  }, []);

  return {
    phase,
    config,
    customTopicInput, setCustomTopicInput,
    isGenerating, generateError,
    setLanguage, setCategory, setQuestionCount,
    toggleTopic, addCustomTopic, removeCustomTopic,
    handleGenerate,
    questions,
    currentQuestion,
    currentIndex,
    isLastQuestion,
    progress,
    userInputs,
    attempts,
    hintUnlocked,
    hintUsed,
    hintVisible,
    isAnswered,
    isWrongShake,
    blankResults,
    isChecking,
    handleInputChange,
    handleSubmit,
    handleShowHint,
    handleSkip,
    handleNext,
    feedback,
    isFeedbackLoading,
    answerRecords,
    reviewOpenId, setReviewOpenId,
    handleRetake,
    handleNewQuestions,
    handleEndSession,
  };
}

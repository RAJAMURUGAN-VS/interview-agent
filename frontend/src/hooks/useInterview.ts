import { useState, useCallback } from 'react';
import { useMediaRecorder } from './useMediaRecorder';
import { useAudioStream } from './useAudioStream';
import * as interviewApi from '../api/interviewApi';
import { useAppStore } from '../store/appStore';
import type { InterviewSubject, InterviewPhase, FeedbackData, InterviewSelectionStep, DepartmentKey } from '../types';
import { getDepartmentByKey } from '../data/departmentSubjects';

export function useInterview(initialSubject?: InterviewSubject) {
  const [phase, setPhase] = useState<InterviewPhase>('welcome');
  const [currentSubject, setCurrentSubject] = useState<InterviewSubject | null>(
    initialSubject ?? null
  );
  const [selectionStep, setSelectionStep] = useState<InterviewSelectionStep>('department');
  const [selectedDeptKey, setSelectedDeptKey] = useState<DepartmentKey | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [recordingStatus, setRecordingStatus] = useState('Click Start Interview to begin');
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { isSpeaking, playStream } = useAudioStream();
  const store = useAppStore();

  const handleSelectDepartment = useCallback((key: DepartmentKey) => {
    const dept = getDepartmentByKey(key);
    if (!dept) return;

    setSelectedDeptKey(key);

    // Self-introduction is a special case — skip subject step
    if (key === 'self-intro') {
      // Directly start interview with "Self Introduction" as subject
      selectSubject('Self Introduction', key);
    } else {
      setSelectionStep('subject');
    }
  }, []);

  const selectSubject = useCallback((subject: InterviewSubject, departmentKey?: DepartmentKey) => {
    setCurrentSubject(subject);
    if (departmentKey) setSelectedDeptKey(departmentKey);
    setSelectionStep('department');
    setPhase('welcome');
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
    store.setSubject(subject);
  }, [store]);

  const handleBackToDepts = useCallback(() => {
    setSelectionStep('department');
    setSelectedDeptKey(null);
  }, []);

  async function startInterview() {
    setPhase('active');
    setRecordingStatus('Connecting...');
    try {
      const departmentLabel = selectedDeptKey
        ? (getDepartmentByKey(selectedDeptKey)?.label ?? 'Engineering')
        : 'Engineering';
      const response = await interviewApi.startInterview(currentSubject!, departmentLabel);
      setRecordingStatus('Listening...');
      await playStream(response, () => {
        setRecordingStatus('Click to record');
      });
    } catch {
      setRecordingStatus('Backend not connected');
    }
  }

  function toggleRecording() {
    if (isSpeaking) return;
    if (!isRecording) {
      startRecording();
      setRecordingStatus('Recording...');
    } else {
      stopRecording();
      setRecordingStatus('Recording complete');
    }
  }

  async function submitAnswer() {
    if (!recordedBlob) return;
    setRecordingStatus('Submitting...');
    try {
      const { meta, response } = await interviewApi.submitAnswer(recordedBlob);
      if (meta.questionNumber && meta.questionNumber > 1) {
        setQuestionNumber(meta.questionNumber);
      }
      setRecordingStatus('Listening...');
      await playStream(response, () => {
        if (meta.isComplete) {
          setPhase('feedback');
          setRecordingStatus('Interview ended');
        } else {
          setRecordingStatus('Click to record');
        }
      });
    } catch {
      setRecordingStatus('Connection error');
    }
  }

  async function endInterview() {
    if (!window.confirm('End interview and get feedback?')) return;
    setRecordingStatus('Ending interview...');
    await getFeedback();
    setPhase('feedback');
    setRecordingStatus('Interview ended');
  }

  async function getFeedback() {
    setIsFeedbackLoading(true);
    try {
      const data = await interviewApi.getFeedback();
      if (data.success) {
        setFeedbackData(data.feedback);
        store.setFeedback(data.feedback);
      }
    } catch {
      // no extra error handling
    } finally {
      setIsFeedbackLoading(false);
    }
  }

  function resetInterview() {
    setPhase('welcome');
    setCurrentSubject(null);
    setSelectionStep('department');
    setSelectedDeptKey(null);
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
    store.reset();
  }

  return {
    phase,
    currentSubject,
    selectionStep,
    selectedDeptKey,
    questionNumber,
    recordingStatus,
    feedbackData,
    isFeedbackLoading,
    isRecording,
    recordedBlob,
    isSpeaking,
    selectSubject,
    handleSelectDepartment,
    handleBackToDepts,
    startInterview,
    toggleRecording,
    submitAnswer,
    endInterview,
    getFeedback,
    resetInterview,
  };
}

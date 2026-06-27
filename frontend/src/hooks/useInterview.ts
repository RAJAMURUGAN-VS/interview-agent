import { useState } from 'react';
import { useMediaRecorder } from './useMediaRecorder';
import { useAudioStream } from './useAudioStream';
import * as interviewApi from '../api/interviewApi';
import type { Subject, InterviewPhase, FeedbackData } from '../types/interview';

export function useInterview() {
  const [phase, setPhase] = useState<InterviewPhase>('welcome');
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [recordingStatus, setRecordingStatus] = useState('Click Start Interview to begin');
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { isSpeaking, playStream } = useAudioStream();

  function selectSubject(subject: Subject) {
    setCurrentSubject(subject);
    setPhase('active');
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
  }

  async function startInterview() {
    setRecordingStatus('Connecting...');
    try {
      const response = await interviewApi.startInterview(currentSubject!);
      playStream(response, () => {});
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
      if (meta.questionNumber) setQuestionNumber(meta.questionNumber);
      playStream(response, () => {
        if (meta.isComplete) {
          setPhase('feedback');
          setRecordingStatus('Interview ended');
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
      if (data.success) setFeedbackData(data.feedback);
    } catch {
      // mirror original: no extra error handling
    } finally {
      setIsFeedbackLoading(false);
    }
  }

  function resetInterview() {
    setPhase('welcome');
    setCurrentSubject(null);
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
  }

  return {
    phase,
    currentSubject,
    questionNumber,
    recordingStatus,
    feedbackData,
    isFeedbackLoading,
    isRecording,
    recordedBlob,
    isSpeaking,
    selectSubject,
    startInterview,
    toggleRecording,
    submitAnswer,
    endInterview,
    getFeedback,
    resetInterview,
  };
}

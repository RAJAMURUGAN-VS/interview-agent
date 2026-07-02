import { useState } from 'react';
import { useMediaRecorder } from './useMediaRecorder';
import { useAudioStream } from './useAudioStream';
import * as interviewApi from '../api/interviewApi';
import { useAppStore } from '../store/appStore';
import type { InterviewSubject, InterviewPhase, FeedbackData } from '../types';

export function useInterview() {
  const [phase, setPhase] = useState<InterviewPhase>('welcome');
  const [currentSubject, setCurrentSubject] = useState<InterviewSubject | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [recordingStatus, setRecordingStatus] = useState('Click Start Interview to begin');
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { isSpeaking, playStream } = useAudioStream();
  const store = useAppStore();

  function selectSubject(subject: InterviewSubject) {
    setCurrentSubject(subject);
    setPhase('welcome');
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
    store.setSubject(subject);
  }

  async function startInterview() {
    setPhase('active');
    setRecordingStatus('Connecting...');
    try {
      const response = await interviewApi.startInterview(currentSubject!);
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
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
    store.reset();
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

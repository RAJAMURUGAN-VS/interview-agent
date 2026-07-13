import { useState, useCallback } from 'react';
import { useMediaRecorder } from './useMediaRecorder';
import { useAudioStream } from './useAudioStream';
import * as interviewApi from '../api/interviewApi';
import { useAppStore } from '../store/appStore';
import type { InterviewPhase, FeedbackData, DepartmentKey, InterviewMessage, InterviewSaveType, InterviewHistoryEntry } from '../types';
import { getDepartmentByKey } from '../data/departmentSubjects';
import { saveInterviewEntry } from './useHistory';

export function useInterview() {
  const [phase, setPhase] = useState<InterviewPhase>('welcome');
  const [selectedDeptKey, setSelectedDeptKey] = useState<DepartmentKey>('cse');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [recordingStatus, setRecordingStatus] = useState('Click Start Interview to begin');
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [conversation, setConversation] = useState<InterviewMessage[]>([]);
  const [reportSaved, setReportSaved] = useState(false);

  const { isRecording, recordedBlob, startRecording, stopRecording } = useMediaRecorder();
  const { isSpeaking, playStream } = useAudioStream();
  const store = useAppStore();

  const appendToConversation = useCallback((msg: InterviewMessage) => {
    setConversation((prev) => [...prev, msg]);
  }, []);

  const handleSelectDepartment = useCallback((key: DepartmentKey) => {
    setSelectedDeptKey(key);
    setCustomSubjectInput('');
    if (key === 'self-intro') {
      setSelectedSubjects(['Self Introduction']);
    } else {
      setSelectedSubjects([]);
    }
  }, []);

  const toggleSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }, []);

  const addCustomSubject = useCallback(() => {
    const s = customSubjectInput.trim();
    if (!s) return;
    setSelectedSubjects((prev) => (prev.includes(s) ? prev : [...prev, s]));
    setCustomSubjectInput('');
  }, [customSubjectInput]);

  const removeCustomSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
  }, []);

  async function startInterview() {
    setPhase('active');
    setRecordingStatus('Connecting...');
    try {
      const departmentLabel = selectedDeptKey
        ? (getDepartmentByKey(selectedDeptKey)?.label ?? 'Engineering')
        : 'Engineering';
      
      const subjectStr = selectedDeptKey === 'self-intro'
        ? 'Self Introduction'
        : selectedSubjects.join(', ');

      store.setSubject(subjectStr);

      const response = await interviewApi.startInterview(subjectStr, departmentLabel);
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
      
      // Track candidate answer
      const questionNumber = meta.questionNumber ?? 1;
      appendToConversation({
        role: 'candidate',
        content: '[Spoken answer]',
        questionNumber: questionNumber - 1,
      });

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
    setSelectedDeptKey('cse');
    setSelectedSubjects([]);
    setCustomSubjectInput('');
    setQuestionNumber(1);
    setRecordingStatus('Click Start Interview to begin');
    setFeedbackData(null);
    setIsFeedbackLoading(false);
    setConversation([]);
    setReportSaved(false);
    store.reset();
  }

  const handleSaveReport = useCallback((saveType: InterviewSaveType) => {
    if (!feedbackData || reportSaved) return;

    const currentSubject = selectedSubjects.join(', ') || selectedDeptKey;
    const entry: InterviewHistoryEntry = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      subject: currentSubject,
      department: selectedDeptKey
        ? (getDepartmentByKey(selectedDeptKey)?.label ?? '')
        : '',
      saveType,
      score: saveType !== 'conversation'
        ? (feedbackData.candidate_score ?? null)
        : null,
      conversation: saveType !== 'feedback' ? conversation : null,
      feedback: saveType !== 'conversation' ? feedbackData : null,
    };

    saveInterviewEntry(entry);
    setReportSaved(true);
  }, [feedbackData, reportSaved, selectedSubjects, selectedDeptKey, conversation]);

  return {
    phase,
    selectedDeptKey,
    selectedSubjects,
    customSubjectInput,
    questionNumber,
    recordingStatus,
    feedbackData,
    isFeedbackLoading,
    isRecording,
    recordedBlob,
    isSpeaking,
    handleSelectDepartment,
    toggleSubject,
    addCustomSubject,
    removeCustomSubject,
    setCustomSubjectInput,
    startInterview,
    toggleRecording,
    submitAnswer,
    endInterview,
    getFeedback,
    resetInterview,
    reportSaved,
    handleSaveReport,
  };
}

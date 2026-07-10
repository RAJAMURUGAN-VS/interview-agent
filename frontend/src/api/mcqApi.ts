import type {
  McqGenerateResponse,
  McqFeedbackResponse,
  McqQuestion,
  McqAnswer,
  McqQuestionCount,
  McqQuestionType,
  McqSourceType,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function generateQuestions(params: {
  source_type:    McqSourceType;
  content?:       string;        // required when source_type === 'text'
  pdfFile?:       File;          // required when source_type === 'pdf'
  topic?:         string;        // required when source_type === 'topic';
                                 // optional focus for text/pdf/url/youtube
  urls?:          string[];      // required when source_type === 'url' or 'youtube'
  question_count: McqQuestionCount;
  question_type:  McqQuestionType;
}): Promise<McqGenerateResponse> {
  const formData = new FormData();
  formData.append('source_type',    params.source_type);
  formData.append('question_count', String(params.question_count));
  formData.append('question_type',  params.question_type);

  if (params.topic) {
    formData.append('topic', params.topic);
  }

  if (params.source_type === 'pdf' && params.pdfFile) {
    formData.append('pdf', params.pdfFile);
  } else if (params.source_type === 'text') {
    formData.append('content', params.content ?? '');
  } else if (params.source_type === 'url') {
    // Send URLs as newline-separated string
    formData.append('urls', (params.urls ?? []).join('\n'));
  } else if (params.source_type === 'youtube') {
    // Send YouTube URLs as newline-separated string
    formData.append('urls', (params.urls ?? []).join('\n'));
  } else if (params.source_type === 'topic') {
    // topic already appended above; no content field needed
  }

  const res = await fetch(`${BASE}/mcq/generate`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function fetchFeedback(params: {
  questions: McqQuestion[];
  answers: McqAnswer[];
  topic: string;
  question_type: McqQuestionType;
}): Promise<McqFeedbackResponse> {
  const res = await fetch(`${BASE}/mcq/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

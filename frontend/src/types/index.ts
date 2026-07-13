// Core subject types
export type InterviewSubject = string; // This allows any subject string — preset or custom.
// The taxonomy is enforced by the UI, not the type system.

// Import and re-export DepartmentKey for convenience
export type { DepartmentKey } from '../data/departmentSubjects';

export type InterviewSelectionStep = 'department' | 'subject';

export type NotesSubject = 'OS' | 'OOP' | 'DBMS' | 'CN';

export type AppTab = 'interview' | 'notes' | 'pdf-chat' | 'mcq' | 'codefill';

export type InterviewPhase = 'welcome' | 'active' | 'feedback';

export interface FeedbackData {
  subject: string;
  candidate_score: number;
  feedback: string;
  areas_of_improvement: string;
  pronunciation_feedback?: PronunciationFeedback;
}

export interface PronunciationPerAnswer {
  answer_number: number;
  filler_count: number;
  fillers_used: string[];
  long_pause_count: number;
  note: string;
}

export interface PronunciationFeedback {
  summary: string;
  tips: string[];
  per_answer: PronunciationPerAnswer[];
}

export interface SubmitAnswerMeta {
  isComplete: boolean;
  questionNumber: number;
}

export interface FeedbackResponse {
  success: boolean;
  feedback: FeedbackData;
}

// ── PDF Chat ──────────────────────────────────────────

export type ChatMode = 'text' | 'speech';

export interface PdfChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: number[];
  isStreaming?: boolean;
}

export interface PdfTab {
  threadId: string;
  fileHash: string;
  fileName: string;
  messages: PdfChatMessage[];
}

export interface UploadResponse {
  success?: boolean;
  thread_id?: string;
  file_hash?: string;
  error?: string;
}

export interface AskTextResponse {
  success?: boolean;
  answer?: string;
  sources?: number[];
  error?: string;
}

// ── MCQ ───────────────────────────────────────────────

export type McqQuestionType  = 'mcq' | 'truefalse' | 'fillup';
export type McqQuestionCount = 5 | 10 | 15 | 20;
export type McqSourceType    = 'text' | 'pdf' | 'topic' | 'url' | 'youtube';
export type McqReviewFilter  = 'all' | 'correct' | 'wrong';
export type McqPhase         = 'setup' | 'quiz' | 'feedback';
export type McqGrade         = 'Excellent' | 'Good' | 'Needs Revision' | 'Poor';
export type McqTimerMode     = 'none' | 'per-question' | 'full-quiz';
export type McqPerQuestionPreset = 10 | 20 | 30 | 45 | 60 | 'custom';
export type McqFullQuizPreset    = 5  | 10 | 15 | 20 | 'custom';
export type McqAnswerStatus  = 'answered' | 'skipped' | 'timeout';

export interface McqTimerConfig {
  mode:              McqTimerMode;
  perQuestionSecs:   number;   // used when mode === 'per-question'
  fullQuizMins:      number;   // used when mode === 'full-quiz'
}

export interface McqOption {
  label: string;
  text: string;
}

export interface McqQuestion {
  id: string;
  type: McqQuestionType;
  question: string;
  options: McqOption[];
  correct_label: string;
  explanation: string;
}

export interface McqAnswer {
  question_id:    string;
  selected_label: string;      // empty string if timeout/skipped
  fill_input:     string;      // filled text for fillup type
  is_correct:     boolean;
  status:         McqAnswerStatus;
}

export interface McqSessionConfig {
  source_type: McqSourceType;
  topic: string;
  question_count: McqQuestionCount;
  question_type: McqQuestionType;
}

export interface McqFeedback {
  score: number;
  total: number;
  percentage: number;
  grade: McqGrade;
  summary: string;
  weak_areas: string[];
  study_tips: string[];
}

export interface McqGenerateResponse {
  success: boolean;
  questions?: McqQuestion[];
  error?: string;
  failed_urls?: string[];
}

export interface McqFeedbackResponse {
  success: boolean;
  feedback?: McqFeedback;
  error?: string;
}

// ── Code Fill ─────────────────────────────────────────

export type CfLanguage      = 'python' | 'java' | 'c' | 'c++';
export type CfCategory      = 'competitive programming' | 'oop';
export type CfPhase         = 'setup' | 'quiz' | 'feedback';
export type CfGrade         = 'Excellent' | 'Good' | 'Needs Practice' | 'Struggling';
export type CfQuestionCount = 5 | 10 | 15 | 20;

export interface CfBlank {
  id: string;
  answer: string;
  hint: string;
}

export interface CfQuestion {
  id: string;
  language: string;
  topic: string;
  prompt: string;
  code_template: string;
  blanks: CfBlank[];
  explanation: string;
}

export interface CfBlankResult {
  blank_id: string;
  is_correct: boolean;
  correct_answer: string;
}

export interface CfAnswerRecord {
  question_id: string;
  user_answers: string[];
  is_correct: boolean;
  attempts: number;
  hint_used: boolean;
  skipped: boolean;
}

export interface CfSessionConfig {
  language: CfLanguage;
  category: CfCategory;
  topics: string[];
  question_count: CfQuestionCount;
}

export interface CfFeedback {
  score: number;
  total: number;
  percentage: number;
  grade: CfGrade;
  summary: string;
  strong_topics: string[];
  weak_topics: string[];
  tips: string[];
}

export interface CfGenerateResponse {
  success: boolean;
  questions?: CfQuestion[];
  error?: string;
}

export interface CfCheckResponse {
  success: boolean;
  all_correct?: boolean;
  blank_results?: CfBlankResult[];
  error?: string;
}

export interface CfFeedbackResponse {
  success: boolean;
  feedback?: CfFeedback;
  error?: string;
}

// ── Insights ──────────────────────────────────────────

export type InsightsDepartment = 'CSE' | 'ECE' | 'AIML' | 'IT' | 'CSBS' | 'Other';
export type InsightsOfferType  = 'On-Campus' | 'Off-Campus' | 'Internship' | 'Full-Time';
export type InsightsDifficulty = 1 | 2 | 3 | 4 | 5;
export type InsightsOutcome    = 'Selected' | 'Rejected' | 'Waiting';
export type InsightsSubTab     = 'experience' | 'preparation';
export type InsightsView       = 'browse' | 'company-detail';
export type InsightsModalStep  = 'type-pick' | 'form' | 'success';
export type InsightsPostType   = 'experience' | 'preparation';

export interface InsightsRound {
  roundName:   string;
  description: string;
}

export interface BasePost {
  id:          string;
  company:     string;
  role:        string;
  department:  InsightsDepartment;
  postedAt:    string;
  upvotes:     number;
  authorAlias: string;
}

export interface InterviewExperiencePost extends BasePost {
  offerType:  InsightsOfferType;
  difficulty: InsightsDifficulty;
  outcome:    InsightsOutcome;
  rounds:     InsightsRound[];
  tips:       string;
}

export interface PreparationStrategyPost extends BasePost {
  prepDurationWeeks: number;
  codingPlatforms:   string[];
  studyMaterials:    string[];
  youtubeChannels:   string[];
  dailyRoutine:      string;
  advice:            string;
}

export interface CompanySummary {
  company:       string;
  expCount:      number;
  prepCount:     number;
  totalPosts:    number;
  avgDifficulty: number | null;
  selectionRate: number | null;
  lastActivity:  string | null;
}

export interface CompanyDetail {
  company:       string;
  totalPosts:    number;
  avgDifficulty: number | null;
  selectionRate: number | null;
  experiences:   InterviewExperiencePost[];
  preparations:  PreparationStrategyPost[];
}

// Form drafts — what the user is filling in before submission
export interface ExperienceDraft {
  company:    string;
  role:       string;
  department: InsightsDepartment | '';
  offerType:  InsightsOfferType  | '';
  difficulty: InsightsDifficulty | null;
  outcome:    InsightsOutcome    | '';
  rounds:     InsightsRound[];
  tips:       string;
}

export interface PreparationDraft {
  company:           string;
  role:              string;
  department:        InsightsDepartment | '';
  prepDurationWeeks: string;             // string for input binding, parsed on submit
  codingPlatforms:   string[];
  studyMaterials:    string[];
  youtubeChannels:   string[];
  dailyRoutine:      string;
  advice:            string;
}

// API response shapes
export interface InsightsCompaniesResponse {
  companies?: CompanySummary[];
  error?:     string;
}

export interface InsightsCompanyDetailResponse extends CompanyDetail {
  error?: string;
}

export interface InsightsSubmitResponse {
  success: boolean;
  post?:   InterviewExperiencePost | PreparationStrategyPost;
  error?:  string;
}

export interface InsightsUpvoteResponse {
  success: boolean;
  upvotes?: number;
  error?:  string;
}

export interface InsightsSearchResponse {
  success:          boolean;
  matchedCompanies: string[];
  experiences:      InterviewExperiencePost[];
  preparations:     PreparationStrategyPost[];
  error?:           string;
}

// ── History ───────────────────────────────────────────

export interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  questionNumber?: number;
}

export type InterviewSaveType = 'conversation' | 'feedback' | 'both';

export interface InterviewHistoryEntry {
  id: string;
  savedAt: string;
  subject: string;
  department: string;
  saveType: InterviewSaveType;
  score: number | null;
  conversation: InterviewMessage[] | null;
  feedback: FeedbackData | null;
}

export interface McqHistoryEntry {
  id: string;
  savedAt: string;
  topic: string;
  sourceType: string;
  questionType: string;
  questionCount: number;
  score: number;
  total: number;
  grade: string;
  feedback: McqFeedback;
  questions: McqQuestion[];
  answers: McqAnswer[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: Date;
}

export interface PdfChatHistoryEntry {
  id: string;
  savedAt: string;
  fileName: string;
  messageCount: number;
  messages: ChatMessage[];
}

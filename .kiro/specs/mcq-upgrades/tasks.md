# MCQ Feature Upgrades — Tasks

## Phase 1: Backend — Dependencies & Config
- [ ] Add tavily-python to requirements.txt
- [ ] Add TAVILY_API_KEY to Config class
- [ ] Add TAVILY_API_KEY placeholder to .env.example
- [ ] Run pip install tavily-python

## Phase 2: Backend — Prompts Update
- [ ] Add FILLUP_SCHEMA constant to mcq_prompts.py
- [ ] Add TOPIC_ONLY_PREFIX constant to mcq_prompts.py
- [ ] Update MCQ_GENERATION_PROMPT with {content_section} placeholder

## Phase 3: Backend — Service Update
- [ ] Add Tavily imports to mcq_service.py
- [ ] Add extract_content_from_urls() function
- [ ] Update _build_generation_prompt() with source_type parameter
- [ ] Update generate_questions() to accept source_type parameter

## Phase 4: Backend — Route Update
- [ ] Update /mcq/generate route to handle all 4 source types
- [ ] Add extract_content_from_urls import
- [ ] Handle topic, url, text, pdf source types with validation

## Phase 5: Frontend — Types Update
- [ ] Add 'fillup' to McqQuestionType
- [ ] Add 'topic' and 'url' to McqSourceType
- [ ] Add timer types: McqTimerMode, McqPerQuestionPreset, McqFullQuizPreset, McqTimerConfig
- [ ] Add failed_urls to McqGenerateResponse
- [ ] Add McqAnswerStatus type
- [ ] Update McqAnswer interface with fill_input and status

## Phase 6: Frontend — API Update
- [ ] Replace generateQuestions function signature
- [ ] Add topic, urls parameters
- [ ] Handle all 4 source types in form data

## Phase 7: Frontend — Timer Logic in useMcq Hook
- [ ] Add timer state (timerConfig, timeRemaining, isTimerRunning, timerRef)
- [ ] Add fillInput, urlList, failedUrls state
- [ ] Add updateTimerConfig, stopTimer, startPerQuestionTimer, startFullQuizTimer helpers
- [ ] Add timer tick useEffect
- [ ] Add handleTimerExpire callback
- [ ] Extract triggerFeedback() function
- [ ] Update handleNext() to use triggerFeedback and record new McqAnswer shape
- [ ] Update handleGenerate() to start timer and pass new params
- [ ] Update resetInterview() to stop timer
- [ ] Update hook return with new state and setters

## Phase 8: Frontend — New UI Components
- [ ] Create TimerBar.tsx component
- [ ] Create UrlInput.tsx component
- [ ] Create FillUpInput.tsx component

## Phase 9: Frontend — SetupPanel & CustomisePanel Update
- [ ] Update SetupPanel with 4-tab source toggle
- [ ] Add topic input panel to SetupPanel
- [ ] Add UrlInput component to SetupPanel
- [ ] Update canGenerate logic in SetupPanel
- [ ] Add failed URL warning to SetupPanel
- [ ] Update CustomisePanel with fill-up question type
- [ ] Add timer configuration section to CustomisePanel
- [ ] Update McqPage.tsx to pass new props to SetupPanel and CustomisePanel

## Phase 10: Frontend — Quiz Components Update
- [ ] Add TimerBar to QuizView above QuestionCard
- [ ] Add fill-up rendering to QuestionCard
- [ ] Add correct answer reveal for fill-up
- [ ] Update McqPage.tsx to pass timer and fill-up props to QuizView

## Phase 11: Frontend — FeedbackView Update
- [ ] Update filter tab counts to include timeout
- [ ] Add timeout indicator to ReviewCard
- [ ] Add fill-up answer display to ReviewCard

## Phase 12: Integration Verification
- [ ] Test existing MCQ flow (text + MCQ type + no timer)
- [ ] Test existing PDF flow (PDF + True/False)
- [ ] Test fill-up type generation and quiz flow
- [ ] Test per-question timer mode
- [ ] Test full-quiz timer mode
- [ ] Test topic-only generation
- [ ] Test URL source with Tavily extraction
- [ ] Test failed URL handling
- [ ] Verify other features unchanged

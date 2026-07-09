# Interview Feature Testing Checklist

## Test Environment
- **URL:** `http://localhost:5173/interview`
- **Browser:** Chrome/Firefox/Safari
- **Backend:** Running (check logs for errors)
- **Frontend:** Running with hot reload

---

## Step 1: Department Selection Screen

### Visual Elements
- [ ] 6 department cards display in 3-column grid
- [ ] Each card shows:
  - [ ] Font Awesome icon (user-tie, laptop-code, microchip, brain, globe, chart-line)
  - [ ] Short label (Self Intro, CSE, ECE, AIML, IT, CSBS)
  - [ ] Full label (complete department name)
- [ ] Subject count badge shows on all except Self Intro
  - [ ] CSE: 10
  - [ ] ECE: 10
  - [ ] AIML: 10
  - [ ] IT: 10
  - [ ] CSBS: 10
  - [ ] Self Intro: No badge
- [ ] Colors are correct per department
  - [ ] Self Intro: Sky blue
  - [ ] CSE: Indigo
  - [ ] ECE: Purple
  - [ ] AIML: Green
  - [ ] IT: Amber
  - [ ] CSBS: Red
- [ ] Hover effects work (border highlight, slight bg change)

### Interactions
- [ ] Clicking "Self Intro" → Goes directly to "Ready to begin?" screen
  - [ ] No subject selection step shown
  - [ ] Subject shows as "Self Introduction"
  - [ ] Interview ready to start
- [ ] Clicking CSE → Shows CSE SubjectGrid with 10 subjects
- [ ] Clicking ECE → Shows ECE SubjectGrid with 10 subjects
- [ ] Clicking AIML → Shows AIML SubjectGrid with 10 subjects
- [ ] Clicking IT → Shows IT SubjectGrid with 10 subjects
- [ ] Clicking CSBS → Shows CSBS SubjectGrid with 10 subjects

---

## Step 2: Subject Selection Screen (for Non-Self-Intro Departments)

### Test CSE Department
- [ ] "Back to Departments" link shows at top
- [ ] Header displays:
  - [ ] CSE icon and color
  - [ ] "CSE" label
  - [ ] "Choose a Subject" heading
- [ ] All 10 CSE subjects display in 2-column grid:
  - [ ] Operating Systems
  - [ ] Object Oriented Programming
  - [ ] Database Management Systems
  - [ ] Computer Networks
  - [ ] Data Structures & Algorithms
  - [ ] Software Engineering
  - [ ] Theory of Computation
  - [ ] Compiler Design
  - [ ] Computer Organization & Architecture
  - [ ] Discrete Mathematics
- [ ] Each subject card has:
  - [ ] Dept-colored dot
  - [ ] Subject name
  - [ ] Hover effect (text brightens)

### Custom Subject Input
- [ ] Input placeholder shows: "e.g. Embedded Systems, IoT, Blockchain…"
- [ ] "Add Custom Subject" label with plus icon shows
- [ ] Start button is DISABLED when input empty
- [ ] Start button is ENABLED when text entered
- [ ] Can type custom subject name
- [ ] Pressing Enter submits custom subject
- [ ] Clicking Start button submits custom subject
- [ ] After submit, goes to "Ready to begin?" with custom subject name

### Interactions
- [ ] Clicking any CSE subject → "Ready to begin?" screen with that subject
- [ ] Back button → Returns to Department Selection
- [ ] After back, can select different department
- [ ] Each department (ECE, AIML, IT, CSBS) has correct 10 subjects

---

## Step 3: Ready to Begin Screen

### For Preset Subjects (e.g., CSE - Operating Systems)
- [ ] Badge shows subject with CSE color (indigo)
- [ ] Question tracker shows "Question 1/5"
- [ ] Heading: "Ready to begin?"
- [ ] Text: "Natalie will ask you 5 questions on [Subject Name]"
- [ ] [Start Interview] button visible and clickable

### For Self Introduction
- [ ] Badge shows "Self Introduction" with sky-blue color
- [ ] Question tracker shows "Question 1/5"
- [ ] Heading: "Ready to begin?"
- [ ] Text: "Natalie will ask you 5 questions on Self Introduction"
- [ ] [Start Interview] button visible and clickable

### For Custom Subject (e.g., "Blockchain")
- [ ] Badge shows "Blockchain" with indigo fallback color
- [ ] Question tracker shows "Question 1/5"
- [ ] Text mentions custom subject name
- [ ] [Start Interview] button visible and clickable

---

## Step 4: Interview Flow (Active Interview)

### Starting Interview
- [ ] Click [Start Interview]
- [ ] Phase changes to "active"
- [ ] Status: "Listening..."
- [ ] Natalie's first question plays as audio
- [ ] Recording button appears and is clickable

### Recording & Answering
- [ ] Recording button: "Click to record"
- [ ] Click button → "Recording..." message
- [ ] Speak your answer
- [ ] Click button again → "Recording complete"
- [ ] [Submit Answer] button appears
- [ ] Click [Submit Answer]
- [ ] Natalie's next question plays
- [ ] Process repeats for Questions 2-5

### Questions Quality
**For CSE - Operating Systems:**
- [ ] Questions should be about OS topics (processes, memory, scheduling, etc.)
- [ ] NOT about ECE or AIML topics

**For ECE - Digital Electronics:**
- [ ] Questions should be about electronics/circuits
- [ ] NOT about software/databases

**For AIML - Machine Learning:**
- [ ] Questions should be about ML/AI concepts
- [ ] NOT about web or infrastructure

**For Self Introduction:**
- [ ] Questions about background, education, projects
- [ ] Questions about strengths and career goals
- [ ] NOT technical questions about any subject

**For Custom Subject (e.g., "Blockchain"):**
- [ ] Natalie should adapt to ask about blockchain concepts
- [ ] Should feel relevant to the custom topic

### Interview Completion
- [ ] After answer to 5th question:
  - [ ] Natalie acknowledges the answer
  - [ ] Says interview is complete
  - [ ] Phase changes to "feedback"
  - [ ] Feedback section appears

---

## Step 5: Feedback Display

- [ ] Feedback card shows with candidate score
- [ ] Feedback shows strengths and areas for improvement
- [ ] Pronunciation feedback visible
- [ ] [New Interview] button appears at bottom

---

## Step 6: Reset Flow

- [ ] Click [New Interview] button
- [ ] Returns to Department Selection screen
- [ ] All state reset:
  - [ ] currentSubject is null
  - [ ] selectionStep is 'department'
  - [ ] selectedDeptKey is null
- [ ] Can select different department
- [ ] Can select different subject

---

## Step 7: Edge Cases & Navigation

### Back Button Behavior
- [ ] Department → Subject: Back button → Department Selection ✓
- [ ] Subject → Ready to Begin: No back button ✓
- [ ] During interview: No back button (can only end early) ✓

### URL Behavior
- [ ] URL stays at `/interview` throughout flow ✓
- [ ] Refreshing page during dept selection → Resets to dept screen ✓
- [ ] Refreshing during subject selection → Resets to dept screen ✓

### Multiple Selections
- [ ] Select CSE → OS → Start → Answer Q1 → [New Interview]
- [ ] Select ECE → VLSI Design → Repeat ✓
- [ ] Select Self Intro → No subject step → Start ✓
- [ ] Select Custom Subject "Quantum Computing" → Start ✓

---

## Step 8: Integration Tests

### Other Features Still Work
- [ ] Notes tab accessible and working
- [ ] PDF Chat tab accessible and working
- [ ] MCQ tab accessible and working
- [ ] Code Fill tab accessible and working
- [ ] Navigation between tabs works

### Badge Component
- [ ] CSE subjects show indigo badge
- [ ] ECE subjects show purple badge
- [ ] AIML subjects show green badge
- [ ] IT subjects show amber badge
- [ ] CSBS subjects show red badge
- [ ] Self Introduction shows sky-blue badge
- [ ] Custom subjects show indigo fallback badge

---

## Step 9: Backend Integration

### API Calls
- [ ] When starting interview, backend receives:
  - [ ] `subject`: The selected subject name
  - [ ] `department`: The selected department label
  - [ ] Example: `{ subject: "Operating Systems", department: "Computer Science & Engineering" }`

### Prompt Formatting
- [ ] Check backend logs:
  - [ ] INTERVIEW_PROMPT receives both {department} and {subject}
  - [ ] Prompt includes special handling for Self Introduction
  - [ ] Questions are department-aware

### Session State
- [ ] Backend SessionState.current_department is set
- [ ] Backend SessionState.current_subject is set
- [ ] Both values persist across questions 1-5

---

## Failure Scenarios & Fixes

### If Self Intro Goes to Subject Selection Instead of Interview
**Problem:** Self Intro department doesn't skip subject step
**Fix:** Check `handleSelectDepartment()` in useInterview hook — should call `selectSubject('Self Introduction')` directly
**Status:** ✓ Fixed in Phase 7

### If Clicking Subject Takes You to /interview/subject Instead of Staying on /interview
**Problem:** Navigation to `/interview/subject-slug` causes routing issues
**Fix:** WelcomePage stays on `/interview` — no navigation after subject selection, show InterviewPanel conditionally
**Status:** ✓ Fixed in routing commit a404187

### If Custom Subject Doesn't Work
**Problem:** Custom subject input doesn't submit
**Fix:** Check SubjectGrid onSelect handler — should call `handleSelectSubject()` with trimmed input
**Status:** ✓ Implemented in Phase 4

### If Badge Shows Wrong Color for Custom Subject
**Problem:** Custom subject shows wrong badge color
**Fix:** Badge component has fallback (indigo) for subjects not in taxonomy
**Status:** ✓ Implemented in Phase 6

---

## Success Criteria

| Feature | Status |
|---------|--------|
| 6 departments display correctly | [ ] |
| Department selection navigates to subjects | [ ] |
| Self Introduction skips subject selection | [ ] |
| All 10 subjects per department display | [ ] |
| Custom subject input works | [ ] |
| Subject selection shows "Ready to begin?" | [ ] |
| Interview asks 5 questions | [ ] |
| Department-relevant questions asked | [ ] |
| Feedback displays correctly | [ ] |
| New Interview resets state | [ ] |
| Back button works correctly | [ ] |
| URL stays at /interview | [ ] |
| Other tabs still accessible | [ ] |

---

## Sign-Off

**Tester Name:** ________________
**Date:** ________________
**All Tests Passed:** [ ] Yes [ ] No

**Issues Found:**
1. ...
2. ...
3. ...

**Notes:**

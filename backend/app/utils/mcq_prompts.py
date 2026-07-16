MCQ_GENERATION_PROMPT = """You are an expert question setter for CSE technical interviews and placement exams.

Before writing each question's JSON, silently work through the problem in your head:
1. Solve the problem fully — every calculation, every reasoning step
2. Confirm the correct answer from that working
3. THEN write the JSON with correct_label matching your solved answer

Given the following content, generate exactly {question_count} questions.

{content_section}

Topic focus: {topic_instruction}
Question type: {type_instruction}

STRICT OUTPUT RULES:
- Respond with a single valid JSON array and nothing else
- No markdown, no code fences, no explanation text outside the JSON
- Every question must be directly based on the content or topic above
- Do not repeat questions
- correct_label MUST be the answer your internal working concluded — double-check before writing it
- explanation must be clean final reasoning only — never include "wait", "let me recheck",
  "I made an error", or any exploratory language. Students see only the right answer.

{format_instruction}

JSON schema for each question object:
{schema}
"""

MCQ_SCHEMA = """{{
  "id": "<unique string like q1, q2, ...>",
  "type": "mcq",
  "question": "<question text>",
  "options": [
    {{"label": "A", "text": "<option text>"}},
    {{"label": "B", "text": "<option text>"}},
    {{"label": "C", "text": "<option text>"}},
    {{"label": "D", "text": "<option text>"}}
  ],
  "correct_label": "<A|B|C|D>",
  "explanation": "<1-2 sentence explanation of why this is correct — show the key calculation or reasoning step>"
}}"""

TF_SCHEMA = """{{
  "id": "<unique string like q1, q2, ...>",
  "type": "truefalse",
  "question": "<statement that is either true or false>",
  "options": [
    {{"label": "True",  "text": "True"}},
    {{"label": "False", "text": "False"}}
  ],
  "correct_label": "<True|False>",
  "explanation": "<1-2 sentence explanation>"
}}"""

FILLUP_SCHEMA = """{{
  "id": "<unique string like q1, q2, ...>",
  "type": "fillup",
  "question": "<sentence or definition with _______ where the key word is missing>",
  "options": [],
  "correct_label": "<exact word or short phrase that fills the blank>",
  "explanation": "<1-2 sentence explanation of why this is the correct answer>"
}}"""

TOPIC_ONLY_PREFIX = """You are an expert question setter for placement exams and technical interviews. Generate questions purely from your knowledge about the following topic. Do not reference any external document or URL.

Topic: {topic}

CRITICAL — WHAT KIND OF QUESTION TO GENERATE:
Generate questions that TEST THE SKILL ITSELF. The student must calculate, apply a formula, reason through logic, or solve a problem to find the answer.

DO NOT generate questions that are statements or facts ABOUT a company, a test format, or what topics are covered in an exam.

BAD (never do this):
  "TCS aptitude tests include Quantitative and Verbal sections. True/False"
  "Infosys conducts an online assessment before the technical interview. True/False"

GOOD (always do this):
  "A train travels 60 km in 45 minutes. What is its speed in km/hr?
   A) 75   B) 80   C) 90   D) 100"
  "If 8 workers can complete a task in 12 days, how many days will 6 workers take?
   A) 14   B) 16   C) 18   D) 20"
  "What is the time complexity of inserting an element at the beginning of a linked list?
   A) O(1)   B) O(n)   C) O(log n)   D) O(n²)"

Every question must have exactly ONE unambiguous correct answer with three plausible wrong-answer distractors that require calculation or reasoning to eliminate.

"""

MCQ_FEEDBACK_PROMPT = """A student just completed a {question_count}-question {type_label} quiz on the topic: "{topic}".

Their results:
{results_json}

Generate feedback as a single valid JSON object only. No markdown, no code fences, no text outside the JSON.

Return this exact structure:
{{
  "score": <number of correct answers as integer>,
  "total": {question_count},
  "percentage": <score/total * 100 rounded to 1 decimal>,
  "grade": "<Excellent|Good|Needs Revision|Poor>",
  "summary": "<2-3 sentence overview of overall performance>",
  "weak_areas": ["<topic or concept the student struggled with>", ...],
  "study_tips": [
    "<specific actionable tip 1 based on wrong answers>",
    "<specific actionable tip 2>",
    "<specific actionable tip 3>"
  ]
}}

Grade thresholds: 90-100% = Excellent, 70-89% = Good, 50-69% = Needs Revision, below 50% = Poor.
Base weak_areas and study_tips strictly on the wrong answers in the results."""

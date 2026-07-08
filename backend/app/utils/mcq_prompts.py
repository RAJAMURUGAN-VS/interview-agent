MCQ_GENERATION_PROMPT = """You are an expert question setter for CSE technical interviews and placement exams.

Given the following content, generate exactly {question_count} questions.

{content_section}

Topic focus: {topic_instruction}
Question type: {type_instruction}

STRICT OUTPUT RULES:
- Respond with a single valid JSON array and nothing else
- No markdown, no code fences, no explanation text outside the JSON
- Every question must be directly based on the content or topic above
- Do not repeat questions

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
  "explanation": "<1-2 sentence explanation of why this is correct>"
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

TOPIC_ONLY_PREFIX = """You are an expert question setter. Generate questions purely from your knowledge about the following topic. Do not reference any external document or URL.

Topic: {topic}

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

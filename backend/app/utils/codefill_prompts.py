CODEFILL_GENERATION_PROMPT = """You are an expert programming tutor creating code fill-in-the-blank exercises for {language} programmers.

Category: {category}
Topics to cover: {topics}
Number of questions: {question_count}

Generate exactly {question_count} code fill-in-the-blank questions.

RULES FOR BLANKS:
- Use ____BLANK_0____, ____BLANK_1____, ____BLANK_2____ etc. as placeholders
- Remove 1 to 4 of the most logically important parts of the code
- The removed parts must be the CORE LOGIC — not syntax boilerplate
- Each blank answer must be a short expression, keyword, value, or operator
  (not multiple lines)
- The number of blanks per snippet is your choice based on complexity —
  simple concepts get 1-2 blanks, complex ones get 3-4
- Every blank must have a conceptual hint that guides thinking WITHOUT
  giving the answer away

RULES FOR CODE:
- Code must be syntactically correct when all blanks are filled
- Use only standard library — no third-party imports
- Keep snippets concise: 5-15 lines maximum
- Each snippet must directly test the specified topic
- Add a brief comment above the code explaining what it does

STRICT OUTPUT RULES:
- Respond with a single valid JSON array and nothing else
- No markdown, no code fences, no text outside the JSON

JSON schema for each question:
{schema}
"""

CODEFILL_SCHEMA = """{{
  "id": "q1",
  "language": "{language}",
  "topic": "<the specific topic this tests>",
  "prompt": "<one sentence instruction, e.g. Fill in the blanks to complete the binary search function>",
  "code_template": "<full code with ____BLANK_0____ placeholders where key logic is removed>",
  "blanks": [
    {{
      "id": "BLANK_0",
      "answer": "<exact correct answer — trimmed, no surrounding quotes>",
      "hint": "<conceptual hint that guides thinking without revealing the answer>"
    }}
  ],
  "explanation": "<2-3 sentence explanation of the complete solution and why these parts are important>"
}}"""

CODEFILL_FEEDBACK_PROMPT = """A student just completed a {question_count}-question code fill-in-the-blank session.

Language: {language}
Category: {category}
Topics covered: {topics}

Session results:
{results_json}

Generate feedback as a single valid JSON object only. No markdown, no code fences, no text outside the JSON.

Return this exact structure:
{{
  "score": <correct answers as integer>,
  "total": {question_count},
  "percentage": <rounded to 1 decimal>,
  "grade": "<Excellent|Good|Needs Practice|Struggling>",
  "summary": "<2-3 encouraging sentences about overall performance, referencing specific topics>",
  "strong_topics": ["<topic the student did well in>"],
  "weak_topics": ["<topic the student struggled with>"],
  "tips": [
    "<specific actionable coding tip based on wrong answers>",
    "<tip 2>",
    "<tip 3>"
  ]
}}

Grade thresholds: 90-100% = Excellent, 70-89% = Good, 50-69% = Needs Practice, below 50% = Struggling.
If a question was skipped, count it as wrong. Keep the tone encouraging — focus on improvement, not failure."""

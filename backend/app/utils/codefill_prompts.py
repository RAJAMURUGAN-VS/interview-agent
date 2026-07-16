CODEFILL_GENERATION_PROMPT = """You are an expert programming tutor creating code fill-in-the-blank exercises for {language} programmers.

Category: {category}
Topics to cover: {topics}
Number of questions: {question_count}

Generate exactly {question_count} code fill-in-the-blank questions.

CRITICAL RULES FOR BLANKS:
1. ONLY remove parts that test the OOP CONCEPT — not trivial strings or implementation details
2. AVOID: Removing string values (e.g., "Dog barks"), method names, variable names
3. FOCUS ON: Keywords, method calls, control flow, operators that demonstrate the concept
4. Each blank answer must be 1-4 words MAX (e.g., "extends", "this.name = name", "super()", "@Override")
5. NEVER create multiple correct answers — the blank must have ONE unambiguous answer
6. Add conceptual hints that guide understanding, not trial-and-error

EXAMPLES OF GOOD BLANKS:
- "extends" (tests inheritance keyword)
- "super()" (tests super call)
- "@Override" (tests override annotation)
- "instanceof" (tests type checking)
- "interface" (tests interface concept)
- "abstract" (tests abstract classes)
- "this.name = name" (tests encapsulation/assignment)
- "public static final" (tests modifiers)

EXAMPLES OF BAD BLANKS (DO NOT USE):
- "Woof" or "Meow" (trivial string answers)
- "System.out.println" (not testing OOP concept)
- Variable names (not relevant to concept)
- Complete method bodies (too long)

RULES FOR CODE FORMATTING:
- Code MUST be properly formatted with correct line breaks
- NO cramming everything on one line
- Proper indentation (2-4 spaces per level)
- Include complete method signatures and closing braces
- Ensure all syntax is 100% correct when blanks are filled

RULES FOR CODE CONTENT:
- Code must be syntactically correct when all blanks are filled
- Use only standard {language} library — no third-party imports
- Keep snippets SHORT: 5-10 lines maximum
- Each snippet must DIRECTLY and UNAMBIGUOUSLY test the specified topic
- Use DIVERSE examples:
  * For inheritance: Don't repeat Animal/Dog — use Employee/Manager, Shape/Circle, etc.
  * For polymorphism: Don't repeat the same pattern — vary implementations
  * For encapsulation: Use different domain objects each time
  * For abstraction: Use different abstract concepts (not all animals)
- Add ONE brief comment line above the code explaining what it does

STRICT OUTPUT RULES:
- Respond with a single valid JSON array and nothing else
- No markdown, no code fences, no text outside the JSON
- Keep all string values properly escaped and valid JSON
- Double-check that code snippets have correct syntax
- Ensure no unescaped quotes or line breaks inside strings

JSON schema for each question:
{schema}
"""

CODEFILL_SCHEMA = """{{
  "id": "q1",
  "language": "{language}",
  "topic": "<the specific topic this tests>",
  "prompt": "<one sentence instruction describing what to fill, e.g. 'Fill in the blank to override the inherited method'>",
  "code_template": "<full multi-line code with proper formatting and ____BLANK_0____ placeholders where key logic is removed>",
  "blanks": [
    {{
      "id": "BLANK_0",
      "answer": "<exact correct answer — no quotes, no padding>",
      "hint": "<conceptual hint that guides thinking without revealing the answer — 1 sentence max>"
    }}
  ],
  "explanation": "<2-3 sentence explanation of why these blanks are important to the concept>"
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

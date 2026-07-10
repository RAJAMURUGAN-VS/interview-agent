import json
from langchain.chat_models import init_chat_model
from ..config import Config
from ..utils.codefill_prompts import (
    CODEFILL_GENERATION_PROMPT,
    CODEFILL_SCHEMA,
    CODEFILL_FEEDBACK_PROMPT,
)

_model = init_chat_model(
    "google_genai:gemini-3.5-flash",
    api_key=Config.GOOGLE_API_KEY,
)

# Competitive Programming topic preset
CP_TOPICS = [
    "if-else", "for loop", "while loop", "do-while", "switch",
    "arrays", "strings", "collections", "matrix", "recursion",
    "dynamic programming", "graphs", "trees", "linked lists",
    "stacks", "queues", "sorting algorithms", "searching algorithms",
    "two pointers", "sliding window", "bit manipulation",
    "greedy algorithms", "backtracking", "hashing",
]

# OOP topic preset
OOP_TOPICS = [
    "classes and objects", "constructors", "encapsulation",
    "abstraction", "inheritance", "polymorphism", "interfaces",
    "static members", "final/const", "access modifiers",
    "method overloading", "method overriding",
    "abstract classes", "generics/templates",
    "exception handling", "design patterns",
]


def _strip_fences(raw: str) -> str:
    """Strip markdown code fences if LLM wraps output despite instructions."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return raw.strip()


def generate_questions(
    language: str,
    category: str,
    topics: list,
    question_count: int,
) -> list:
    """
    Call LLM to generate code fill-in-the-blank questions.
    Returns list of question dicts matching CODEFILL_SCHEMA.
    """
    schema = CODEFILL_SCHEMA.format(language=language)
    prompt = CODEFILL_GENERATION_PROMPT.format(
        language=language,
        category=category,
        topics=", ".join(topics),
        question_count=question_count,
        schema=schema,
    )

    response = _model.invoke([{"role": "user", "content": prompt}])
    raw = _strip_fences(response.content)
    questions = json.loads(raw)

    if not isinstance(questions, list):
        raise ValueError("LLM did not return a JSON array")

    # Assign stable ids if LLM omitted them
    for i, q in enumerate(questions):
        if not q.get("id"):
            q["id"] = f"q{i + 1}"
        # Normalise blank ids
        for j, blank in enumerate(q.get("blanks", [])):
            if not blank.get("id"):
                blank["id"] = f"BLANK_{j}"

    return questions


import re as _re

# Operators where surrounding whitespace is purely stylistic
# (both `<=n` and `<= n` compile identically)
_OPERATORS = [
    r'<<=', r'>>=',           # compound shift-assign (3-char first)
    r'&&', r'\|\|',           # logical
    r'<<', r'>>',             # shift
    r'<=', r'>=', r'!=', r'==',  # comparison
    r'\+\+', r'--',           # unary inc/dec
    r'\+=', r'-=', r'\*=', r'/=', r'%=', r'&=', r'\|=', r'\^=',  # compound assign
    r'->', r'\.',              # member access
    r'<', r'>',               # less/greater (must come after << >> <= >=)
    r'[+\-*/%&|^~!]',         # single-char operators
    r'=',                     # simple assign (must come after == != +=  etc.)
]
# Build a pattern that matches any operator
_OP_PATTERN = _re.compile(
    r'\s*(' + '|'.join(_OPERATORS) + r')\s*'
)


def _normalize(s: str) -> str:
    """
    Normalize a code answer for compiler-aware comparison:

    1. Strip outer whitespace.
    2. Remove spaces around operators so spacing is irrelevant:
         '<= n'  →  '<=n'
         'i ++'  →  'i++'
         'i + 1' →  'i+1'
    3. Collapse remaining runs of whitespace to a single space so that
       keyword-to-identifier spacing is preserved:
         'else if'  stays 'else if'   (two word tokens — space required)
         'elseif'   stays 'elseif'    (one token — would fail against 'else if')
         'return n' stays 'return n'
    4. Lowercase everything.

    Result: '<=n' == '<= n', 'i++' == 'i ++', '>= n' == '>=n'
            but 'elseif' ≠ 'else if'
    """
    s = s.strip().lower()
    # Remove spaces around every operator
    s = _OP_PATTERN.sub(r'\1', s)
    # Collapse any remaining multi-space gaps to single space
    s = _re.sub(r'[ \t]+', ' ', s).strip()
    return s


def check_answer(question: dict, user_answers: list) -> dict:
    """
    Compare user-submitted answers against correct answers for all blanks.
    Returns { all_correct, blank_results }
    """
    blanks = question.get("blanks", [])
    results = []
    all_correct = True

    for i, blank in enumerate(blanks):
        user_val   = user_answers[i] if i < len(user_answers) else ""
        correct    = blank.get("answer", "")
        is_correct = _normalize(user_val) == _normalize(correct)

        if not is_correct:
            all_correct = False

        results.append({
            "blank_id":       blank["id"],
            "is_correct":     is_correct,
            "correct_answer": correct.strip(),
        })

    return {"all_correct": all_correct, "blank_results": results}


def generate_feedback(
    language: str,
    category: str,
    topics: list,
    questions: list,
    answer_records: list,
) -> dict:
    """
    Call LLM to generate post-session feedback.
    """
    question_map = {q["id"]: q for q in questions}

    results = []
    for rec in answer_records:
        q = question_map.get(rec["question_id"], {})
        results.append({
            "topic":      q.get("topic", ""),
            "prompt":     q.get("prompt", ""),
            "is_correct": rec.get("is_correct", False),
            "skipped":    rec.get("skipped", False),
            "attempts":   rec.get("attempts", 0),
            "hint_used":  rec.get("hint_used", False),
        })

    prompt = CODEFILL_FEEDBACK_PROMPT.format(
        question_count=len(questions),
        language=language,
        category=category,
        topics=", ".join(topics),
        results_json=json.dumps(results, indent=2),
    )

    response = _model.invoke([{"role": "user", "content": prompt}])
    raw = _strip_fences(response.content)
    return json.loads(raw)

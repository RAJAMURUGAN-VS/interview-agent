import json
from langchain.chat_models import init_chat_model
from ..config import Config
from ..utils.codefill_prompts import (
    CODEFILL_GENERATION_PROMPT,
    CODEFILL_SCHEMA,
    CODEFILL_FEEDBACK_PROMPT,
)

_model = init_chat_model(
    "google_genai:gemini-2.5-flash",
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


def check_answer(question: dict, user_answers: list) -> dict:
    """
    Compare user-submitted answers against correct answers for all blanks.
    Returns { all_correct, blank_results }
    """
    blanks = question.get("blanks", [])
    results = []
    all_correct = True

    for i, blank in enumerate(blanks):
        user_val  = (user_answers[i] if i < len(user_answers) else "").strip()
        correct   = blank.get("answer", "").strip()
        is_correct = user_val.lower() == correct.lower()

        if not is_correct:
            all_correct = False

        results.append({
            "blank_id":       blank["id"],
            "is_correct":     is_correct,
            "correct_answer": correct,
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

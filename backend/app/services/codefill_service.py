import json
from langchain.chat_models import init_chat_model
from ..config import Config
from ..utils.codefill_prompts import (
    CODEFILL_GENERATION_PROMPT,
    CODEFILL_SCHEMA,
    CODEFILL_FEEDBACK_PROMPT,
)

_model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY,
    max_tokens=4000,   # cap output to prevent silent mid-JSON truncation
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


def _repair_json(raw: str) -> str:
    """
    Attempt to repair common JSON issues from LLM output:
    - Unescaped quotes in strings
    - Unescaped newlines
    - Single quotes instead of double quotes
    """
    # First attempt: try parsing as-is
    try:
        json.loads(raw)
        return raw  # Already valid
    except json.JSONDecodeError:
        pass
    
    # Attempt 2: Replace single quotes with double quotes (risky but common)
    attempt = raw.replace("'", '"')
    try:
        json.loads(attempt)
        print("[JSON REPAIR] Fixed by replacing single quotes")
        return attempt
    except json.JSONDecodeError:
        pass
    
    # Attempt 3: Escape unescaped quotes in the string content
    # This is a more careful approach
    import re
    
    # Find unescaped quotes within JSON string values
    # Look for patterns like: "text with "unescaped" quotes"
    def escape_unescaped_quotes(match):
        content = match.group(1)
        # Escape internal quotes that aren't already escaped
        content = content.replace('\\"', '<<ESCAPED_QUOTE>>')  # Temporarily protect escaped quotes
        content = content.replace('"', '\\"')  # Escape unescaped quotes
        content = content.replace('<<ESCAPED_QUOTE>>', '\\"')  # Restore protected quotes
        return f'"{content}"'
    
    attempt = re.sub(r'"([^"]*(?:\\.[^"]*)*)"', escape_unescaped_quotes, raw)
    try:
        json.loads(attempt)
        print("[JSON REPAIR] Fixed by escaping internal quotes")
        return attempt
    except json.JSONDecodeError:
        pass
    
    # Attempt 4: Remove or escape newlines within strings
    attempt = raw.replace('\n', '\\n').replace('\r', '\\r')
    try:
        json.loads(attempt)
        print("[JSON REPAIR] Fixed by escaping newlines")
        return attempt
    except json.JSONDecodeError:
        pass
    
    print("[JSON REPAIR] Failed - returning original")
    return raw


def _recover_partial_json(raw: str) -> list:
    """
    When the LLM truncates mid-array, try to salvage all COMPLETE JSON
    objects from the array before the cut-off point.

    Strategy: scan for complete {...} blocks inside the outer [...] and
    parse each one individually.  Returns a list of dicts (possibly empty).
    """
    import re
    # Strip opening '[' and any trailing garbage after the last complete ']}'
    text = raw.strip()
    if text.startswith("["):
        text = text[1:]

    results = []
    depth = 0
    start = None

    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                fragment = text[start:i + 1]
                try:
                    obj = json.loads(fragment)
                    results.append(obj)
                except json.JSONDecodeError:
                    pass  # skip broken fragments
                start = None

    return results


# How many questions to request per LLM call.
# Smaller batches mean shorter responses that are less likely to be truncated.
_BATCH_SIZE = 3


def _call_llm_for_questions(language: str, category: str, topics: list, count: int) -> list:
    """
    Single LLM call for `count` questions.  Returns a (possibly empty) list.
    Handles JSON repair and partial-truncation recovery automatically.
    """
    schema = CODEFILL_SCHEMA.format(language=language)
    prompt = CODEFILL_GENERATION_PROMPT.format(
        language=language,
        category=category,
        topics=", ".join(topics),
        question_count=count,
        schema=schema,
    )

    response = _model.invoke([{"role": "user", "content": prompt}])
    raw = _strip_fences(response.content)

    # --- attempt 1: full repair then parse ---
    repaired = _repair_json(raw)
    try:
        questions = json.loads(repaired)
        if isinstance(questions, list):
            return questions
    except json.JSONDecodeError:
        pass

    # --- attempt 2: partial-truncation recovery ---
    print(f"[CODEFILL] Full parse failed, attempting partial recovery...")
    recovered = _recover_partial_json(raw)
    if recovered:
        print(f"[CODEFILL] Recovered {len(recovered)} question(s) from truncated response")
        return recovered

    # --- give up: log and return empty ---
    print(f"[CODEFILL ERROR] Could not parse response. First 300 chars: {raw[:300]}")
    return []


def generate_questions(
    language: str,
    category: str,
    topics: list,
    question_count: int,
) -> list:
    """
    Generate `question_count` questions by calling the LLM in small batches
    of _BATCH_SIZE to avoid token-limit truncation of the JSON response.
    """
    all_questions: list = []
    remaining = question_count
    topic_cycle = list(topics)  # rotate topics across batches

    while remaining > 0:
        batch_size = min(remaining, _BATCH_SIZE)
        # Pick a rotating subset of topics so each batch covers different ground
        batch_topics = topic_cycle[: max(1, len(topic_cycle))]

        print(f"[CODEFILL] Requesting batch of {batch_size} questions "
              f"({question_count - remaining + batch_size}/{question_count} total)")

        batch = _call_llm_for_questions(language, category, batch_topics, batch_size)
        all_questions.extend(batch)
        remaining -= batch_size

        # Rotate topics so next batch picks different ones
        if len(topic_cycle) > 1:
            topic_cycle = topic_cycle[1:] + topic_cycle[:1]

    if not all_questions:
        raise ValueError(
            "LLM returned no valid questions after all batches. "
            "Please try again or select different topics."
        )

    # Re-assign sequential ids and normalise blanks
    for i, q in enumerate(all_questions):
        q["id"] = f"q{i + 1}"
        for j, blank in enumerate(q.get("blanks", [])):
            if not blank.get("id"):
                blank["id"] = f"BLANK_{j}"

    return all_questions[:question_count]  # trim any extras


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

    try:
        response = _model.invoke([{"role": "user", "content": prompt}])
        raw = _strip_fences(response.content)
        
        # Attempt to repair JSON if needed
        raw = _repair_json(raw)
        
        feedback = json.loads(raw)
        return feedback
    except json.JSONDecodeError as e:
        print(f"[CODEFILL FEEDBACK ERROR] JSON parsing failed: {e}")
        print(f"[CODEFILL FEEDBACK ERROR] Raw response (first 500 chars): {raw[:500]}")
        # Return a safe fallback feedback
        return {
            "summary": "Feedback could not be generated due to processing error.",
            "strengths": [],
            "areas_to_improve": [],
            "next_steps": "Try the quiz again or select different topics."
        }

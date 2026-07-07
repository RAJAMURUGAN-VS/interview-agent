import json
import tempfile
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.chat_models import init_chat_model
from ..config import Config
from ..utils.mcq_prompts import (
    MCQ_GENERATION_PROMPT,
    MCQ_SCHEMA,
    TF_SCHEMA,
    MCQ_FEEDBACK_PROMPT,
)

# Separate model instance — no coupling with interview agent state
_model = init_chat_model(
    "google_genai:gemini-2.5-flash",
    api_key=Config.GOOGLE_API_KEY,
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Save uploaded PDF bytes to a temp file, extract all page text
    using PyPDFLoader, and return concatenated string.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        docs = loader.load()
        return "\n\n".join(doc.page_content for doc in docs if doc.page_content)
    finally:
        os.unlink(tmp_path)


def _build_generation_prompt(
    content: str,
    question_count: int,
    topic: str,
    question_type: str,
) -> str:
    topic_instruction = (
        f"Focus ONLY on the topic: '{topic}'"
        if topic.strip()
        else "Cover a balanced mix of the most important topics in the notes"
    )

    if question_type == "mcq":
        type_instruction = "Multiple choice with 4 options (A, B, C, D)"
        format_instruction = (
            "Each question must have exactly 4 distinct options. "
            "Only one option must be correct."
        )
        schema = MCQ_SCHEMA
    else:  # truefalse
        type_instruction = "True or False statements"
        format_instruction = (
            "Each question must be a clear factual statement "
            "that is definitively true or false. "
            "Mix roughly equal true and false answers."
        )
        schema = TF_SCHEMA

    return MCQ_GENERATION_PROMPT.format(
        question_count=question_count,
        content=content[:12000],
        topic_instruction=topic_instruction,
        type_instruction=type_instruction,
        format_instruction=format_instruction,
        schema=schema,
    )


def generate_questions(
    content: str,
    question_count: int,
    topic: str,
    question_type: str,
) -> list:
    """
    Call the LLM to generate MCQ questions from provided content.
    Returns a list of question dicts matching MCQ_SCHEMA or TF_SCHEMA.
    """
    prompt = _build_generation_prompt(content, question_count, topic, question_type)
    messages = [{"role": "user", "content": prompt}]
    response = _model.invoke(messages)
    raw = response.content.strip()

    # Strip code fences defensively
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    questions = json.loads(raw)

    if not isinstance(questions, list):
        raise ValueError("LLM did not return a JSON array")

    # Assign stable ids if LLM omitted them
    for i, q in enumerate(questions):
        if not q.get("id"):
            q["id"] = f"q{i + 1}"

    return questions


def generate_feedback(
    questions: list,
    answers: list,
    topic: str,
    question_type: str,
) -> dict:
    """
    Call the LLM to generate post-quiz feedback.
    answers: list of { question_id, selected_label, is_correct }
    """
    question_map = {q["id"]: q for q in questions}
    results = []
    for ans in answers:
        q = question_map.get(ans["question_id"], {})
        results.append({
            "question":       q.get("question", ""),
            "correct_label":  q.get("correct_label", ""),
            "selected_label": ans["selected_label"],
            "is_correct":     ans["is_correct"],
        })

    type_label = "multiple-choice" if question_type == "mcq" else "True/False"
    topic_display = topic.strip() if topic.strip() else "mixed topics"

    prompt = MCQ_FEEDBACK_PROMPT.format(
        question_count=len(questions),
        type_label=type_label,
        topic=topic_display,
        results_json=json.dumps(results, indent=2),
    )

    messages = [{"role": "user", "content": prompt}]
    response = _model.invoke(messages)
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    return json.loads(raw)

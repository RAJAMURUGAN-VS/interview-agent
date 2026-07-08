import json
import tempfile
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.chat_models import init_chat_model
from tavily import TavilyClient
from ..config import Config
from ..utils.mcq_prompts import (
    MCQ_GENERATION_PROMPT,
    MCQ_SCHEMA,
    TF_SCHEMA,
    FILLUP_SCHEMA,
    TOPIC_ONLY_PREFIX,
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


def extract_content_from_urls(urls: list[str]) -> tuple[str, list[str]]:
    """
    Extract text content from a list of URLs using Tavily Search API.
    Returns (merged_content_string, list_of_failed_urls).

    Uses TavilyClient.extract() which is designed specifically for
    content extraction from URLs (not search). Each URL is extracted
    individually. Failed URLs are collected and returned for user warning.
    Content from all successful URLs is merged with a separator.
    """
    client = TavilyClient(api_key=Config.TAVILY_API_KEY)
    extracted_parts = []
    failed_urls = []

    for url in urls:
        url = url.strip()
        if not url:
            continue
        try:
            result = client.extract(urls=[url])
            # Tavily extract returns { "results": [{ "url", "raw_content" }] }
            results = result.get("results", [])
            if results and results[0].get("raw_content"):
                extracted_parts.append(
                    f"--- Content from {url} ---\n"
                    f"{results[0]['raw_content'][:8000]}"
                )
            else:
                failed_urls.append(url)
        except Exception:
            failed_urls.append(url)

    merged = "\n\n".join(extracted_parts)
    return merged, failed_urls


def _build_generation_prompt(
    content: str,
    question_count: int,
    topic: str,
    question_type: str,
    source_type: str = "text",   # "text" | "pdf" | "topic" | "url"
) -> str:
    """
    Fill MCQ_GENERATION_PROMPT template with runtime values.
    Handles all four source types:
      - text/pdf/url: wraps content in "Study notes:" block
      - topic: uses TOPIC_ONLY_PREFIX instead (no content block)
    """
    topic_instruction = (
        f"Focus ONLY on the topic: '{topic}'"
        if topic.strip()
        else "Cover a balanced mix of the most important topics in the content"
    )

    if question_type == "mcq":
        type_instruction = "Multiple choice with 4 options (A, B, C, D)"
        format_instruction = (
            "Each question must have exactly 4 distinct options. "
            "Only one option must be correct."
        )
        schema = MCQ_SCHEMA
    elif question_type == "truefalse":
        type_instruction = "True or False statements"
        format_instruction = (
            "Each question must be a clear factual statement "
            "that is definitively true or false. "
            "Mix roughly equal true and false answers."
        )
        schema = TF_SCHEMA
    else:  # fillup
        type_instruction = "Fill-in-the-blank questions"
        format_instruction = (
            "Each question must be a sentence or definition with exactly one "
            "key word or short phrase replaced by _______. "
            "The correct_label must be the single missing word or short phrase. "
            "The options array must be empty []."
        )
        schema = FILLUP_SCHEMA

    # Build content_section based on source type
    if source_type == "topic":
        content_section = TOPIC_ONLY_PREFIX.format(topic=topic)
        # Override topic_instruction — topic IS the subject
        topic_instruction = f"The entire quiz is about: '{topic}'"
    else:
        # text, pdf, or url — all provide content
        content_section = f"Study notes:\n\"\"\"\n{content[:12000]}\n\"\"\""

    return MCQ_GENERATION_PROMPT.format(
        question_count=question_count,
        content_section=content_section,
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
    source_type: str = "text",   # ← add this parameter
) -> list:
    """
    Call the LLM to generate MCQ/True-False/Fill-up questions.
    source_type controls how content_section is built in the prompt.
    """
    prompt = _build_generation_prompt(
        content, question_count, topic, question_type, source_type
    )
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

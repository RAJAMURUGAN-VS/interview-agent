import json
import tempfile
import os
import re
from langchain_community.document_loaders import PyPDFLoader
from langchain.chat_models import init_chat_model
from ..config import Config
from ..utils.mcq_prompts import (
    MCQ_GENERATION_PROMPT,
    MCQ_SCHEMA,
    TF_SCHEMA,
    FILLUP_SCHEMA,
    TOPIC_ONLY_PREFIX,
    MCQ_FEEDBACK_PROMPT,
)

# Separate model instance — using Perplexity Sonar
_model = init_chat_model(
    "perplexity:sonar-pro",
    api_key=Config.PERPLEXITY_API_KEY,
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


def extract_video_id(url: str) -> str | None:
    """
    Extract YouTube video ID from any standard YouTube URL format.
    Supports: https://www.youtube.com/watch?v=VIDEO_ID,
              https://youtu.be/VIDEO_ID,
              https://www.youtube.com/embed/VIDEO_ID
    Returns None if URL is not a recognisable YouTube URL.
    """
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def extract_content_from_urls(urls: list[str]) -> tuple[str, list[str]]:
    """
    Extract text content from URLs using fast HTTP requests with short timeout.
    Returns (merged_content_string, list_of_failed_urls).
    
    Uses direct HTTP requests for speed. Firecrawl is too slow for interactive use.
    """
    extracted_parts = []
    failed_urls = []

    for url in urls:
        url = url.strip()
        if not url:
            continue

        try:
            import requests
            from html.parser import HTMLParser
            
            # Fast HTTP request with 8-second timeout
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            resp = requests.get(url, headers=headers, timeout=8)
            resp.raise_for_status()

            # Simple text extraction from HTML
            class SimpleTextExtractor(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.text = []
                    self.skip_tags = {"script", "style", "meta", "link", "noscript"}
                    self.skip_depth = 0

                def handle_starttag(self, tag, attrs):
                    if tag in self.skip_tags:
                        self.skip_depth += 1

                def handle_endtag(self, tag):
                    if tag in self.skip_tags and self.skip_depth > 0:
                        self.skip_depth -= 1

                def handle_data(self, data):
                    if self.skip_depth == 0:
                        text = data.strip()
                        if text:
                            self.text.append(text)

            parser = SimpleTextExtractor()
            parser.feed(resp.text)
            content = "\n".join(parser.text)

            if content and len(content.strip()) > 100:
                extracted_parts.append(
                    f"--- Content from {url} ---\n"
                    f"{content.strip()[:8000]}"
                )
            else:
                failed_urls.append(url)

        except requests.exceptions.Timeout:
            print(f"Timeout downloading {url} (>8s)")
            failed_urls.append(url)
        except Exception as e:
            print(f"Failed to extract content from {url}: {e}")
            failed_urls.append(url)

    merged = "\n\n".join(extracted_parts)
    return merged, failed_urls


def extract_content_from_youtube(urls: list[str]) -> tuple[str, list[str]]:
    """
    Extract transcript text from one or more YouTube video URLs.
    Returns (merged_transcript_string, list_of_failed_urls).

    Each video's transcript is prepended with a header showing the URL.
    Transcripts are joined with double newlines before being passed to
    the MCQ generation pipeline exactly like URL-extracted content.
    Truncated to 8000 chars per video to avoid token overflow.
    """
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled, NoTranscriptFound
    )

    extracted_parts = []
    failed_urls = []

    for url in urls:
        url = url.strip()
        if not url:
            continue

        video_id = extract_video_id(url)
        if not video_id:
            failed_urls.append(url)
            continue

        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_text = " ".join(
                item["text"] for item in transcript_list
            ).strip()

            if full_text:
                extracted_parts.append(
                    f"--- Transcript from {url} ---\n"
                    f"{full_text[:8000]}"
                )
            else:
                failed_urls.append(url)

        except (TranscriptsDisabled, NoTranscriptFound):
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


def _get_response_text(response) -> str:
    content = response.content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(item.get("text", item.get("content", "")))
            elif hasattr(item, "text"):
                parts.append(getattr(item, "text") or "")
            elif hasattr(item, "content"):
                parts.append(getattr(item, "content") or "")
            else:
                parts.append(str(item))
        return "".join(parts).strip()
    elif isinstance(content, str):
        return content.strip()
    else:
        return str(content).strip()


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
    
    import time
    response = None
    for attempt in range(3):
        try:
            response = _model.invoke(messages)
            break
        except Exception as e:
            if any(k in str(e) for k in ["503", "UNAVAILABLE", "rate limit", "quota", "resource_exhausted", "429"]):
                print(f"GenAI 503/429 load warning, retrying in {2 * (attempt + 1)}s... Error: {e}")
                time.sleep(2 * (attempt + 1))
                continue
            else:
                raise e
    if not response:
        raise ValueError("The AI model is currently busy under high demand. Please try again in a few seconds.")

    raw = _get_response_text(response)

    # Strip code fences defensively
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback repair: replace single quotes with double quotes
        try:
            # simple replacement for single quotes (e.g. {'id': 'q1'} -> {"id": "q1"})
            # Note: This is a fallback and shouldn't run often because of JSON mode.
            repaired = raw.replace("'", '"')
            parsed = json.loads(repaired)
        except Exception:
            raise ValueError(f"LLM returned invalid JSON: {raw[:200]}")

    if isinstance(parsed, dict):
        # Look for any list inside the dict (e.g. "questions", "quiz", etc.)
        questions = None
        for val in parsed.values():
            if isinstance(val, list):
                questions = val
                break
        if questions is None:
            raise ValueError("LLM did not return a JSON array or a dictionary containing an array")
    elif isinstance(parsed, list):
        questions = parsed
    else:
        raise ValueError("LLM did not return a JSON array or object")

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
    
    import time
    response = None
    for attempt in range(3):
        try:
            response = _model.invoke(messages)
            break
        except Exception as e:
            if any(k in str(e) for k in ["503", "UNAVAILABLE", "rate limit", "quota", "resource_exhausted", "429"]):
                print(f"GenAI 503/429 load warning, retrying in {2 * (attempt + 1)}s... Error: {e}")
                time.sleep(2 * (attempt + 1))
                continue
            else:
                raise e
    if not response:
        raise ValueError("The AI model is currently busy under high demand. Please try again in a few seconds.")

    raw = _get_response_text(response)

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    return json.loads(raw)

from flask import Blueprint, request, jsonify
from ..services.mcq_service import (
    extract_text_from_pdf,
    extract_content_from_urls,
    extract_content_from_youtube,
    generate_questions,
    generate_feedback,
)

bp = Blueprint("mcq", __name__)


@bp.route("/mcq/generate", methods=["POST"])
def generate():
    """
    Generate MCQ/True-False/Fill-up questions from one of five source types:
      - "text":    pasted plain text notes (existing)
      - "pdf":     uploaded PDF file (existing)
      - "topic":   topic name only — AI generates from own knowledge (existing)
      - "url":     one or more website URLs extracted via Firecrawl (upgraded)
      - "youtube": one or more YouTube video transcripts (new)

    Accepts multipart/form-data with fields:
      source_type    : "text" | "pdf" | "topic" | "url" | "youtube"
      content        : plain text (source_type == "text")
      pdf            : PDF file   (source_type == "pdf")
      topic          : topic name (source_type == "topic"; also optional focus
                       for text/pdf/url/youtube)
      urls           : newline-separated or comma-separated URL/YouTube link list
                       (source_type == "url" or "youtube")
      question_count : 5 | 10 | 15 | 20
      question_type  : "mcq" | "truefalse" | "fillup"

    Returns:
      {
        "success": true,
        "questions": [...],
        "failed_urls": ["https://..."]   ← only present when source_type=url or youtube
      }
    """
    source_type    = request.form.get("source_type", "text")
    topic          = request.form.get("topic", "").strip()
    question_type  = request.form.get("question_type", "mcq")
    failed_urls    = []

    try:
        question_count = int(request.form.get("question_count", 10))
    except ValueError:
        question_count = 10

    if question_count not in (5, 10, 15, 20):
        question_count = 10

    # ── Extract content based on source type ──────────────────────────────
    content = ""

    if source_type == "pdf":
        if "pdf" not in request.files:
            return jsonify({"success": False,
                            "error": "No PDF file provided"}), 400
        pdf_file = request.files["pdf"]
        if not pdf_file.filename.lower().endswith(".pdf"):
            return jsonify({"success": False,
                            "error": "File must be a PDF"}), 400
        content = extract_text_from_pdf(pdf_file.read())
        if not content or len(content) < 100:
            return jsonify({"success": False,
                            "error": "Could not extract enough text from the PDF."}), 400

    elif source_type == "text":
        content = request.form.get("content", "").strip()
        if len(content) < 100:
            return jsonify({"success": False,
                            "error": "Content is too short. Minimum 100 characters."}), 400

    elif source_type == "topic":
        if not topic:
            return jsonify({"success": False,
                            "error": "Please enter a topic name."}), 400
        content = ""   # not used — prompt uses TOPIC_ONLY_PREFIX instead

    elif source_type == "url":
        raw_urls = request.form.get("urls", "")
        # Accept newline-separated or comma-separated URLs
        url_list = [
            u.strip()
            for u in raw_urls.replace(",", "\n").splitlines()
            if u.strip()
        ]
        if not url_list:
            return jsonify({"success": False,
                            "error": "Please provide at least one URL."}), 400

        content, failed_urls = extract_content_from_urls(url_list)

        if not content or len(content) < 100:
            return jsonify({
                "success": False,
                "error": "Could not extract enough content from the provided URLs. "
                         "Please check the URLs and try again.",
                "failed_urls": failed_urls,
            }), 400

    elif source_type == "youtube":
        raw_urls = request.form.get("urls", "")
        # Accept newline-separated or comma-separated YouTube URLs
        url_list = [
            u.strip()
            for u in raw_urls.replace(",", "\n").splitlines()
            if u.strip()
        ]
        if not url_list:
            return jsonify({"success": False,
                            "error": "Please provide at least one YouTube URL."}), 400

        content, failed_urls = extract_content_from_youtube(url_list)

        if not content or len(content) < 100:
            return jsonify({
                "success": False,
                "error": (
                    "Could not extract transcripts from the provided YouTube URLs. "
                    "Make sure the videos have captions/transcripts enabled."
                ),
                "failed_urls": failed_urls,
            }), 400

    else:
        return jsonify({"success": False,
                        "error": f"Unknown source_type: {source_type}"}), 400

    # ── Generate questions ─────────────────────────────────────────────────
    try:
        questions = generate_questions(
            content, question_count, topic, question_type, source_type
        )
        response = {"success": True, "questions": questions}
        if failed_urls:
            response["failed_urls"] = failed_urls
        return jsonify(response)

    except Exception as e:
        return jsonify({"success": False,
                        "error": f"Failed to generate questions: {str(e)}"}), 500


@bp.route("/mcq/feedback", methods=["POST"])
def feedback():
    """
    Generate post-quiz feedback based on questions and user answers.

    Accepts JSON body:
      {
        "questions":     [...],
        "answers":       [...],
        "topic":         "...",
        "question_type": "mcq" | "truefalse"
      }
    """
    data          = request.json or {}
    questions     = data.get("questions", [])
    answers       = data.get("answers", [])
    topic         = data.get("topic", "")
    question_type = data.get("question_type", "mcq")

    if not questions or not answers:
        return jsonify({"success": False, "error": "Missing questions or answers"}), 400

    try:
        result = generate_feedback(questions, answers, topic, question_type)
        return jsonify({"success": True, "feedback": result})
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate feedback: {str(e)}"
        }), 500

from flask import Blueprint, request, jsonify
from ..services.codefill_service import (
    generate_questions,
    check_answer,
    generate_feedback,
)

bp = Blueprint("codefill", __name__)

ALLOWED_LANGUAGES  = {"c", "c++", "java", "python"}
ALLOWED_CATEGORIES = {"competitive programming", "oop"}
ALLOWED_COUNTS     = {5, 10, 15, 20}


@bp.route("/codefill/generate", methods=["POST"])
def generate():
    """Generate code fill-in-the-blank questions."""
    data = request.json or {}

    language       = data.get("language", "").strip().lower()
    category       = data.get("category", "").strip().lower()
    topics         = data.get("topics", [])
    question_count = data.get("question_count", 10)

    if language not in ALLOWED_LANGUAGES:
        return jsonify({"success": False,
                        "error": f"Language must be one of: {', '.join(ALLOWED_LANGUAGES)}"}), 400

    if category not in ALLOWED_CATEGORIES:
        return jsonify({"success": False,
                        "error": "Category must be 'competitive programming' or 'oop'"}), 400

    if not topics or not isinstance(topics, list):
        return jsonify({"success": False,
                        "error": "Select at least one topic"}), 400

    if question_count not in ALLOWED_COUNTS:
        question_count = 10

    try:
        questions = generate_questions(language, category, topics, question_count)
        return jsonify({"success": True, "questions": questions})
    except Exception as e:
        error_str = str(e)
        # Check for quota exceeded error
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
            return jsonify({
                "success": False,
                "error": "API quota exceeded. Please try again tomorrow or upgrade to a paid plan at https://ai.google.dev"
            }), 429
        return jsonify({"success": False,
                        "error": f"Failed to generate questions: {str(e)}"}), 500


@bp.route("/codefill/check", methods=["POST"])
def check():
    """Check user's answers for a single question's blanks."""
    data = request.json or {}
    question     = data.get("question")
    user_answers = data.get("user_answers", [])

    if not question:
        return jsonify({"success": False, "error": "Missing question"}), 400

    try:
        result = check_answer(question, user_answers)
        return jsonify({"success": True, **result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/codefill/feedback", methods=["POST"])
def feedback():
    """Generate post-session feedback."""
    data = request.json or {}

    language       = data.get("language", "")
    category       = data.get("category", "")
    topics         = data.get("topics", [])
    questions      = data.get("questions", [])
    answer_records = data.get("answer_records", [])

    if not questions or not answer_records:
        return jsonify({"success": False,
                        "error": "Missing questions or answer_records"}), 400

    try:
        result = generate_feedback(language, category, topics, questions, answer_records)
        return jsonify({"success": True, "feedback": result})
    except Exception as e:
        error_str = str(e)
        # Check for quota exceeded error
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
            return jsonify({
                "success": False,
                "error": "API quota exceeded. Please try again tomorrow or upgrade to a paid plan at https://ai.google.dev"
            }), 429
        return jsonify({"success": False,
                        "error": f"Failed to generate feedback: {str(e)}"}), 500

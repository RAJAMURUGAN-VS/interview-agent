"""
Prep Plan blueprint — /prep-plan/* endpoints.

Endpoints:
  POST /prep-plan/generate           { companyName, days } → full PrepPlan
  GET  /prep-plan/company-status     ?company=  → cache status (fast check)
  GET  /prep-plan/cached-companies   → list of all cached company names
  POST /prep-plan/assess             { company, topic, difficulty, questionCount }
                                     → MCQ questions ready to run inline
"""

import logging
from flask import Blueprint, jsonify, request

from ..services import prep_plan_service
from ..services import company_pattern_cache as cache
from ..services.mcq_service import generate_questions

logger = logging.getLogger(__name__)

bp = Blueprint("prep_plan", __name__, url_prefix="/prep-plan")


# ---------------------------------------------------------------------------
# POST /prep-plan/generate
# ---------------------------------------------------------------------------

@bp.route("/generate", methods=["POST"])
def generate():
    """
    Generate a full day-by-day prep plan for a given company + day count.

    Request JSON:
      { "companyName": str, "days": int }

    Response:
      {
        "success": true,
        "company": { ...CompanyPattern... },
        "days": 10,
        "timeline": [
          {
            "dayNumber": 1,
            "isReview": false,
            "topic": "Arrays & String Manipulation",
            "topicWeight": 22.0,
            "explanation": "...",
            "resources": [ { "type", "title", "url", "description" }, ... ]
          },
          ...
        ]
      }

    NOTE: Cold requests (company not cached) trigger live Tavily + Sonar calls
    and may take 20-40 seconds. Use GET /prep-plan/company-status first to
    show the frontend an accurate loading message.
    """
    data = request.get_json(force=True, silent=True) or {}

    company = str(data.get("companyName", "")).strip()
    days    = data.get("days")

    if not company:
        return jsonify({"success": False, "error": "companyName is required."}), 400

    try:
        days = int(days)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "days must be an integer."}), 400

    if not (1 <= days <= 90):
        return jsonify({"success": False, "error": "days must be between 1 and 90."}), 400

    try:
        result = prep_plan_service.generate_prep_plan(company, days)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 422
    except Exception as exc:
        logger.exception("Prep plan generation failed")
        return jsonify({"success": False, "error": f"Generation failed: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# GET /prep-plan/company-status
# ---------------------------------------------------------------------------

@bp.route("/company-status", methods=["GET"])
def company_status():
    """
    Quick cache check — lets the frontend show an accurate loading message
    before kicking off the (potentially slow) generate call.

    Query params:
      company: str

    Response:
      {
        "cached": bool,
        "confidence": "high"|"medium"|"low"|null,
        "displayName": str|null
      }
    """
    company = request.args.get("company", "").strip()
    if not company:
        return jsonify({"cached": False, "confidence": None, "displayName": None})

    row = cache.get_company_pattern(company)
    if row:
        return jsonify({
            "cached":      True,
            "confidence":  row.confidence,
            "displayName": row.display_name,
        })
    return jsonify({"cached": False, "confidence": None, "displayName": None})


# ---------------------------------------------------------------------------
# GET /prep-plan/cached-companies
# ---------------------------------------------------------------------------

@bp.route("/cached-companies", methods=["GET"])
def cached_companies():
    """
    Return the list of company display names that are currently cached.
    Used by CompanyInput.tsx for autocomplete suggestions.
    """
    names = cache.list_cached_companies()
    return jsonify({"companies": names})


# ---------------------------------------------------------------------------
# POST /prep-plan/assess
# ---------------------------------------------------------------------------

# Map frontend difficulty labels to MCQ question counts that make sense
_DIFFICULTY_COUNTS = {
    "Easy":        5,
    "Easy-Medium": 7,
    "Medium":      10,
    "Medium-High": 10,
    "High":        15,
}

# Topics that are aptitude/verbal — use truefalse instead of code-style MCQ
_APTITUDE_TOPIC_KEYWORDS = {
    "aptitude", "verbal", "logical", "reasoning", "quantitative",
    "quant", "english", "comprehension",
}


@bp.route("/assess", methods=["POST"])
def assess():
    """
    Generate an inline MCQ assessment for a single Prep Plan day.

    Reuses the existing MCQ service (source_type='topic') — no new LLM
    prompt needed. The topic is enriched with the company name so questions
    are contextualised (e.g. "Arrays for TCS NQT" rather than generic arrays).

    Request JSON:
      {
        "company":       str,   e.g. "TCS"
        "topic":         str,   e.g. "Arrays & String Manipulation"
        "difficulty":    str,   "Easy" | "Easy-Medium" | "Medium" | "Medium-High" | "High"
        "questionCount": int    optional override (5 | 10 | 15 | 20), default from difficulty
      }

    Response (success):
      {
        "success": true,
        "questions": [ ...McqQuestion objects... ],
        "questionType": "mcq" | "truefalse",
        "topic": str,
        "estimatedMinutes": int
      }
    """
    data = request.get_json(force=True, silent=True) or {}

    company    = str(data.get("company",    "")).strip()
    topic      = str(data.get("topic",      "")).strip()
    difficulty = str(data.get("difficulty", "Medium")).strip()

    if not topic:
        return jsonify({"success": False, "error": "topic is required."}), 400

    # Determine question count
    try:
        q_count = int(data.get("questionCount") or _DIFFICULTY_COUNTS.get(difficulty, 10))
    except (TypeError, ValueError):
        q_count = 10
    if q_count not in (5, 10, 15, 20):
        # Snap to nearest allowed value
        q_count = min((5, 10, 15, 20), key=lambda x: abs(x - q_count))

    # Decide question type: aptitude/verbal topics → truefalse works well;
    # coding topics → standard MCQ
    topic_lower    = topic.lower()
    is_aptitude    = any(kw in topic_lower for kw in _APTITUDE_TOPIC_KEYWORDS)
    question_type  = "truefalse" if is_aptitude else "mcq"

    # Build a rich topic hint that gives the LLM company context
    enriched_topic = (
        f"{topic} (as tested by {company})" if company else topic
    )

    try:
        # Reuse mcq_service.generate_questions() with source_type='topic'
        # content="" is correct for topic mode — the service uses TOPIC_ONLY_PREFIX
        questions = generate_questions(
            content        = "",
            question_count = q_count,
            topic          = enriched_topic,
            question_type  = question_type,
            source_type    = "topic",
        )

        # Estimate ~3 min/question for MCQ, ~1.5 min for truefalse
        mins_per_q     = 1.5 if is_aptitude else 3
        estimated_mins = round(q_count * mins_per_q)

        return jsonify({
            "success":          True,
            "questions":        questions,
            "questionType":     question_type,
            "topic":            topic,
            "estimatedMinutes": estimated_mins,
        }), 200

    except Exception as exc:
        logger.exception(f"Assessment generation failed for topic='{topic}'")
        return jsonify({
            "success": False,
            "error":   f"Could not generate assessment: {str(exc)}",
        }), 500

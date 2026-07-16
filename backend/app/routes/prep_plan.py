"""
Prep Plan blueprint — /prep-plan/* endpoints.

Endpoints:
  POST /prep-plan/generate           { companyName, days } → full PrepPlan
  GET  /prep-plan/company-status     ?company=  → cache status (fast check)
  GET  /prep-plan/cached-companies   → list of all cached company names
  POST /prep-plan/assess             { company, topic, difficulty, questionCount,
                                       conceptsToMaster, formatNotes }
                                     → MCQ questions ready to run inline
"""

import logging
import random
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

_DIFFICULTY_COUNTS = {
    "Easy":        5,
    "Easy-Medium": 5,
    "Medium":      5,
    "Medium-High": 10,
    "High":        10,
}


def _build_topic_seed(
    topic: str,
    concepts: list[str],
    company: str,
    difficulty: str,
    format_notes: str,
) -> str:
    """
    Build a rich, specific topic string for mcq_service.generate_questions().

    Instead of the broad category label (e.g. "Aptitude (Quantitative…)"),
    we sample from concepts_to_master so the LLM receives concrete patterns
    like "Speed and distance, Profit and loss, Ratio and proportion" and
    generates actual solvable problems — not facts about the topic.

    A context_hint line at the end grounds the style in the company's
    known format and difficulty level.
    """
    # Use concepts if available; fall back to the raw topic name
    if concepts:
        # Sample up to 5 concepts so a 10-question set spans multiple patterns
        sampled = random.sample(concepts, min(5, len(concepts)))
        seed = ", ".join(sampled)
    else:
        seed = topic

    # Company + difficulty grounding line
    hint_parts = [f"Style these as {company}'s actual assessment would ask them" if company else ""]
    if difficulty and difficulty != "Medium":
        hint_parts.append(f"Difficulty level: {difficulty}")
    if format_notes:
        hint_parts.append(format_notes.strip(". "))

    hint = ". ".join(p for p in hint_parts if p)
    return f"{seed}. {hint}" if hint else seed


@bp.route("/assess", methods=["POST"])
def assess():
    """
    Generate an inline MCQ assessment for a single Prep Plan day.

    Uses source_type='topic' on the existing MCQ service — no new LLM prompt.
    Seeds generation from conceptsToMaster (specific sub-skills) rather than
    the broad topic label so questions require actual calculation/problem-solving.

    Always uses 'mcq' question type — truefalse cannot represent solvable
    problems (aptitude, DSA, or otherwise).

    Request JSON:
      {
        "company":          str,    e.g. "TCS"
        "topic":            str,    e.g. "Aptitude (Quantitative, Numerical...)"
        "difficulty":       str,    "Easy" | "Easy-Medium" | "Medium" | "Medium-High" | "High"
        "questionCount":    int,    optional override (5 | 10 | 15 | 20)
        "conceptsToMaster": list,   specific sub-skills from the day's plan
        "formatNotes":      str,    optional company-specific format note
      }

    Response:
      {
        "success": true,
        "questions": [ ...McqQuestion objects... ],
        "questionType": "mcq",
        "topic": str,
        "estimatedMinutes": int
      }
    """
    data = request.get_json(force=True, silent=True) or {}

    company      = str(data.get("company",    "")).strip()
    topic        = str(data.get("topic",      "")).strip()
    difficulty   = str(data.get("difficulty", "Medium")).strip()
    concepts     = data.get("conceptsToMaster") or []
    format_notes = str(data.get("formatNotes", "")).strip()

    if not topic:
        return jsonify({"success": False, "error": "topic is required."}), 400

    # Determine question count — snap to allowed set {5, 10, 15, 20}
    try:
        q_count = int(data.get("questionCount") or _DIFFICULTY_COUNTS.get(difficulty, 10))
    except (TypeError, ValueError):
        q_count = 10
    if q_count not in (5, 10, 15, 20):
        q_count = min((5, 10, 15, 20), key=lambda x: abs(x - q_count))

    # Always MCQ — truefalse cannot represent computation-based problems
    question_type = "mcq"

    # Build a specific, concept-grounded topic seed (Fix 2 + 4)
    enriched_topic = _build_topic_seed(topic, concepts, company, difficulty, format_notes)

    try:
        questions = generate_questions(
            content        = "",
            question_count = q_count,
            topic          = enriched_topic,
            question_type  = question_type,
            source_type    = "topic",
        )

        return jsonify({
            "success":          True,
            "questions":        questions,
            "questionType":     question_type,
            "topic":            topic,
            "estimatedMinutes": q_count * 3,   # ~3 min per MCQ
        }), 200

    except Exception as exc:
        logger.exception(f"Assessment generation failed for topic='{topic}'")
        return jsonify({
            "success": False,
            "error":   f"Could not generate assessment: {str(exc)}",
        }), 500

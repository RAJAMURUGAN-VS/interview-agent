"""
Insights service — all DB reads/writes and business logic.
Routes stay thin; everything queryable lives here.
"""

import random
from .. import db
from ..models.insights_models import InterviewExperience, PreparationStrategy

# ---------------------------------------------------------------------------
# Author alias generation
# ---------------------------------------------------------------------------

_DEPTS   = ["CSE", "ECE", "AIML", "IT", "CSBS"]
_SUFFIXES = ["'23 Alum", "'24 Alum", "'25 Alum", "'26 Grad"]


def _make_alias(department: str) -> str:
    """
    Build an anonymous alias like "CSE '25 Alum".
    Falls back to a random dept if the supplied one is unrecognised.
    """
    dept = department if department in _DEPTS else random.choice(_DEPTS)
    return f"{dept} {random.choice(_SUFFIXES)}"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

BLOCKED_TERMS = [
    "fuck", "shit", "bitch", "asshole", "bastard",
    "cunt", "damn", "crap",
]

MIN_TEXT_LEN = 30


def _check_text(text: str, field: str) -> str | None:
    """Return an error string, or None if the text is acceptable."""
    if len(text.strip()) < MIN_TEXT_LEN:
        return f"'{field}' is too short (minimum {MIN_TEXT_LEN} characters)."
    lower = text.lower()
    for term in BLOCKED_TERMS:
        if term in lower:
            return f"'{field}' contains disallowed language."
    return None


# ---------------------------------------------------------------------------
# Company listing
# ---------------------------------------------------------------------------

def get_companies(search: str = "") -> list[dict]:
    """
    Return a list of companies that have at least one post, with aggregate stats.
    Optionally filter by a search string (company name prefix/contains).
    """
    # Collect all company names from both tables
    exp_companies  = {r.company for r in InterviewExperience.query.with_entities(InterviewExperience.company).all()}
    prep_companies = {r.company for r in PreparationStrategy.query.with_entities(PreparationStrategy.company).all()}
    all_companies  = exp_companies | prep_companies

    if search:
        q = search.lower()
        all_companies = {c for c in all_companies if q in c.lower()}

    results = []
    for company in sorted(all_companies):
        exps  = InterviewExperience.query.filter_by(company=company, reported=False).all()
        preps = PreparationStrategy.query.filter_by(company=company, reported=False).all()

        exp_count  = len(exps)
        prep_count = len(preps)
        total      = exp_count + prep_count

        # Average difficulty from experience posts
        avg_difficulty = (
            round(sum(e.difficulty for e in exps) / exp_count, 1)
            if exp_count else None
        )

        # Selection rate
        selected   = sum(1 for e in exps if e.outcome == "Selected")
        sel_rate   = round(selected / exp_count * 100) if exp_count else None

        # Most recent post date
        all_dates  = [e.posted_at for e in exps] + [p.posted_at for p in preps]
        last_activity = max(all_dates) if all_dates else None

        results.append({
            "company":       company,
            "expCount":      exp_count,
            "prepCount":     prep_count,
            "totalPosts":    total,
            "avgDifficulty": avg_difficulty,
            "selectionRate": sel_rate,
            "lastActivity":  last_activity,
        })

    # Most-active companies first
    results.sort(key=lambda x: x["totalPosts"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Company detail
# ---------------------------------------------------------------------------

def get_company_posts(company: str) -> dict:
    """Return all non-reported experience + prep posts for a single company."""
    exps  = (
        InterviewExperience.query
        .filter_by(company=company, reported=False)
        .order_by(InterviewExperience.posted_at.desc())
        .all()
    )
    preps = (
        PreparationStrategy.query
        .filter_by(company=company, reported=False)
        .order_by(PreparationStrategy.posted_at.desc())
        .all()
    )

    # Header stats
    total      = len(exps) + len(preps)
    avg_diff   = round(sum(e.difficulty for e in exps) / len(exps), 1) if exps else None
    selected   = sum(1 for e in exps if e.outcome == "Selected")
    sel_rate   = round(selected / len(exps) * 100) if exps else None

    return {
        "company":       company,
        "totalPosts":    total,
        "avgDifficulty": avg_diff,
        "selectionRate": sel_rate,
        "experiences":   [e.to_dict() for e in exps],
        "preparations":  [p.to_dict() for p in preps],
    }


# ---------------------------------------------------------------------------
# Submit posts
# ---------------------------------------------------------------------------

def submit_experience(data: dict) -> tuple[dict, int]:
    """
    Validate and insert a new InterviewExperience row.
    Returns (response_dict, http_status_code).
    """
    # Required fields
    required = ["company", "role", "department", "offerType", "difficulty", "outcome", "rounds"]
    for field in required:
        if field not in data or data[field] in (None, "", []):
            return {"success": False, "error": f"'{field}' is required."}, 400

    # Rounds: need at least one with non-empty description
    rounds = data.get("rounds", [])
    if not isinstance(rounds, list) or len(rounds) == 0:
        return {"success": False, "error": "At least one round is required."}, 400
    for r in rounds:
        err = _check_text(r.get("description", ""), "round description")
        if err:
            return {"success": False, "error": err}, 400

    # Tips are optional — only check length if provided
    tips = data.get("tips", "").strip()
    if tips and len(tips) < MIN_TEXT_LEN:
        return {"success": False, "error": f"'tips' is too short (minimum {MIN_TEXT_LEN} characters)."}, 400

    difficulty = int(data["difficulty"])
    if difficulty not in range(1, 6):
        return {"success": False, "error": "Difficulty must be 1–5."}, 400

    dept = data["department"]
    alias = _make_alias(dept)

    exp = InterviewExperience(
        company      = data["company"].strip(),
        role         = data["role"].strip(),
        department   = dept,
        offer_type   = data["offerType"],
        difficulty   = difficulty,
        outcome      = data["outcome"],
        tips         = tips or None,
        author_alias = alias,
    )
    exp.rounds = rounds
    db.session.add(exp)
    db.session.commit()

    return {"success": True, "post": exp.to_dict()}, 201


def submit_preparation(data: dict) -> tuple[dict, int]:
    """
    Validate and insert a new PreparationStrategy row.
    Returns (response_dict, http_status_code).
    """
    required = ["company", "role", "department", "prepDurationWeeks", "advice"]
    for field in required:
        if field not in data or data[field] in (None, "", []):
            return {"success": False, "error": f"'{field}' is required."}, 400

    err = _check_text(data.get("advice", ""), "advice")
    if err:
        return {"success": False, "error": err}, 400

    try:
        weeks = int(data["prepDurationWeeks"])
        if weeks < 1 or weeks > 104:
            raise ValueError
    except (ValueError, TypeError):
        return {"success": False, "error": "prepDurationWeeks must be a number between 1 and 104."}, 400

    dept = data["department"]
    alias = _make_alias(dept)

    prep = PreparationStrategy(
        company            = data["company"].strip(),
        role               = data["role"].strip(),
        department         = dept,
        prep_duration_weeks= weeks,
        daily_routine      = data.get("dailyRoutine", "").strip() or None,
        advice             = data["advice"].strip(),
        author_alias       = alias,
    )
    prep.coding_platforms = data.get("codingPlatforms", [])
    prep.study_materials  = data.get("studyMaterials", [])
    prep.youtube_channels = data.get("youtubeChannels", [])

    db.session.add(prep)
    db.session.commit()

    return {"success": True, "post": prep.to_dict()}, 201


# ---------------------------------------------------------------------------
# Upvote
# ---------------------------------------------------------------------------

def upvote_post(post_type: str, post_id: str) -> tuple[dict, int]:
    if post_type == "experience":
        post = InterviewExperience.query.get(post_id)
    elif post_type == "preparation":
        post = PreparationStrategy.query.get(post_id)
    else:
        return {"success": False, "error": "Invalid post type."}, 400

    if post is None:
        return {"success": False, "error": "Post not found."}, 404

    post.upvotes += 1
    db.session.commit()
    return {"success": True, "upvotes": post.upvotes}, 200


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def report_post(post_type: str, post_id: str) -> tuple[dict, int]:
    if post_type == "experience":
        post = InterviewExperience.query.get(post_id)
    elif post_type == "preparation":
        post = PreparationStrategy.query.get(post_id)
    else:
        return {"success": False, "error": "Invalid post type."}, 400

    if post is None:
        return {"success": False, "error": "Post not found."}, 404

    post.reported = True
    db.session.commit()
    return {"success": True}, 200


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_posts(query: str) -> dict:
    """
    Light full-text search: checks company, role, tips/advice fields.
    Returns matched companies (primary) and individual posts (secondary).
    """
    if not query or len(query.strip()) < 2:
        return {"success": False, "error": "Query too short."}, 400

    q = f"%{query.lower()}%"

    # Experience matches
    exp_matches = (
        InterviewExperience.query
        .filter(
            db.or_(
                db.func.lower(InterviewExperience.company).like(q),
                db.func.lower(InterviewExperience.role).like(q),
                db.func.lower(InterviewExperience.tips).like(q),
            ),
            InterviewExperience.reported == False,
        )
        .order_by(InterviewExperience.upvotes.desc())
        .limit(20)
        .all()
    )

    # Preparation matches
    prep_matches = (
        PreparationStrategy.query
        .filter(
            db.or_(
                db.func.lower(PreparationStrategy.company).like(q),
                db.func.lower(PreparationStrategy.role).like(q),
                db.func.lower(PreparationStrategy.advice).like(q),
            ),
            PreparationStrategy.reported == False,
        )
        .order_by(PreparationStrategy.upvotes.desc())
        .limit(20)
        .all()
    )

    # Collect matched company names (for routing the UI to company detail)
    matched_companies = sorted(
        {e.company for e in exp_matches} | {p.company for p in prep_matches}
    )

    return {
        "success":          True,
        "matchedCompanies": matched_companies,
        "experiences":      [e.to_dict() for e in exp_matches],
        "preparations":     [p.to_dict() for p in prep_matches],
    }

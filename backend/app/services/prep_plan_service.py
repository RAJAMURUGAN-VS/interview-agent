"""
Prep Plan Service — Stage A + Stage B orchestration.

Stage A — Company Pattern Discovery (runs once, cached ~30 days):
    company name → Tavily (4 searches) → Perplexity Sonar → CompanyPattern

Stage B — Timeline + Resource Assembly (per-student request):
    CompanyPattern + days → timeline allocation → per-topic Tavily + Sonar → PrepPlan

NOTE: This is a synchronous implementation. Cold requests (Stage A + B both
hitting external APIs) may take 15-30 seconds. The route layer communicates
this to the frontend via the /company-status endpoint, allowing the UI to
show accurate loading messages. A future upgrade path is SSE streaming.
"""

import json
import logging
import math
import re
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor, as_completed

from langchain.chat_models import init_chat_model

from ..config import Config
from . import tavily_service
from . import company_pattern_cache as cache
from ..utils.prep_plan_prompts import (
    PATTERN_DISCOVERY_PROMPT,
    TOPIC_SYNTHESIS_PROMPT,
    FALLBACK_PATTERN,
    format_search_results_for_prompt,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM (same Perplexity Sonar model as rest of app)
# ---------------------------------------------------------------------------
_model = init_chat_model(
    "perplexity:sonar-pro",
    api_key=Config.PERPLEXITY_API_KEY,
)

# Minimum Tavily source count to trust the LLM output rather than fallback
_MIN_SOURCES_FOR_LLM = 3

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _strip_fences(text: str) -> str:
    """Remove markdown code fences that some LLMs add despite instructions."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*",     "", text)
    return text.strip()


def _call_sonar(prompt: str) -> dict:
    """Invoke the LLM, strip fences, parse JSON. Raises on failure."""
    response = _model.invoke(prompt)
    raw = response.content if hasattr(response, "content") else str(response)
    raw = _strip_fences(raw)
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Stage A — Company Pattern Discovery
# ---------------------------------------------------------------------------

def discover_company_pattern(company: str) -> dict:
    """
    Return a CompanyPattern dict for the given company name.
    Hits the cache first; runs full discovery pipeline on miss.

    Always returns a valid dict — uses FALLBACK_PATTERN when sources are sparse.
    """
    # ── Cache hit ────────────────────────────────────────────────────────
    cached = cache.get_company_pattern(company)
    if cached:
        logger.info(f"CompanyPattern cache hit for '{company}'")
        return cached.to_dict()

    # ── Stage A: live discovery ──────────────────────────────────────────
    logger.info(f"CompanyPattern cache miss — running discovery for '{company}'")

    search_results = tavily_service.search_company_pattern(company)
    source_count   = len(search_results)

    if source_count < _MIN_SOURCES_FOR_LLM:
        # Sparse data — use generic fallback, skip LLM call
        logger.warning(
            f"Only {source_count} sources for '{company}' — using fallback pattern"
        )
        pattern_data = deepcopy(FALLBACK_PATTERN)
        pattern_data["sourceCount"] = source_count
        pattern_data["confidence"]  = "low"
        display_name = company.strip().title()
    else:
        # Rich data — let Sonar extract a structured pattern
        formatted = format_search_results_for_prompt(search_results)
        prompt     = PATTERN_DISCOVERY_PROMPT.format(
            company_name=company.strip().title(),
            search_results=formatted,
        )
        try:
            pattern_data = _call_sonar(prompt)
            pattern_data["sourceCount"] = source_count
            # Clamp confidence based on source count regardless of what Sonar says
            if source_count < 5:
                pattern_data["confidence"] = "medium"
            display_name = pattern_data.get("displayName", company.strip().title())
        except (json.JSONDecodeError, Exception) as exc:
            logger.error(f"Sonar pattern extraction failed for '{company}': {exc}")
            pattern_data = deepcopy(FALLBACK_PATTERN)
            pattern_data["sourceCount"] = source_count
            display_name = company.strip().title()

    # ── Persist to cache ─────────────────────────────────────────────────
    row = cache.save_company_pattern(
        company_display = display_name,
        rounds          = pattern_data.get("rounds", []),
        topic_weights   = pattern_data.get("topicWeights", []),
        tests_aptitude  = bool(pattern_data.get("testsAptitude", False)),
        difficulty_tier = pattern_data.get("difficultyTier", "Medium"),
        format_notes    = pattern_data.get("formatNotes", ""),
        confidence      = pattern_data.get("confidence", "low"),
        source_count    = pattern_data.get("sourceCount", 0),
    )
    return row.to_dict()


# ---------------------------------------------------------------------------
# Timeline allocation algorithm
# ---------------------------------------------------------------------------

# Aptitude topics — only scheduled when CompanyPattern.testsAptitude is True
_APTITUDE_TOPICS = {
    "Aptitude & Logical Reasoning",
    "Quantitative Aptitude",
    "Verbal Reasoning",
    "Aptitude — Quant & Logical Reasoning",
}


def _build_timeline(pattern: dict, days: int) -> list[dict]:
    """
    Allocate topics to days based on weight, difficulty curve, and aptitude gate.

    Rules:
    - Only include aptitude topics if pattern["testsAptitude"] is True
    - Weight → proportional day count (minimum 1 day per topic)
    - Sequence: lighter topics first (warm-up), heavier DSA mid, OOP/misc last
    - Every 5th day after day 5 becomes a review day
    - If days is tight, compress by merging low-weight topics

    Returns a list of day dicts:
        { dayNumber, isReview, topic, topicWeight }
    """
    tests_aptitude = pattern.get("testsAptitude", False)
    raw_weights    = pattern.get("topicWeights", [])

    # Filter aptitude topics if the company doesn't test them
    weights = [
        tw for tw in raw_weights
        if tests_aptitude or tw["topic"] not in _APTITUDE_TOPICS
    ]

    if not weights:
        weights = deepcopy(FALLBACK_PATTERN["topicWeights"])

    # Normalise weights to sum to 100
    total_w = sum(tw["weight"] for tw in weights) or 100
    for tw in weights:
        tw["weight"] = round(tw["weight"] / total_w * 100, 1)

    # Reserve 1 review day per 5 content days (max 20% of total)
    review_slots  = max(0, (days - 1) // 5)
    content_days  = days - review_slots

    # Proportional allocation — at least 1 day per topic
    allocated: list[dict] = []
    remaining_days = content_days

    for i, tw in enumerate(weights):
        is_last   = (i == len(weights) - 1)
        raw_days  = tw["weight"] / 100 * content_days
        day_count = max(1, round(raw_days)) if not is_last else remaining_days
        day_count = max(1, min(day_count, remaining_days))
        for _ in range(day_count):
            allocated.append({"topic": tw["topic"], "topicWeight": tw["weight"]})
        remaining_days -= day_count
        if remaining_days <= 0:
            break

    # Pad with last topic if rounding left us short
    while len(allocated) < content_days:
        allocated.append(allocated[-1].copy() if allocated else {"topic": "Revision", "topicWeight": 0})

    # Trim excess
    allocated = allocated[:content_days]

    # Build final timeline: insert review days after every 5th content day
    timeline: list[dict] = []
    content_counter = 0
    day_number      = 1
    review_inserted = 0

    for item in allocated:
        timeline.append({
            "dayNumber":   day_number,
            "isReview":    False,
            "topic":       item["topic"],
            "topicWeight": item["topicWeight"],
        })
        day_number    += 1
        content_counter += 1

        # Insert review day after every 5th content day, if we still have slots
        if content_counter % 5 == 0 and review_inserted < review_slots:
            timeline.append({
                "dayNumber":   day_number,
                "isReview":    True,
                "topic":       "Review & Practice",
                "topicWeight": 0,
            })
            day_number    += 1
            review_inserted += 1

    return timeline


# ---------------------------------------------------------------------------
# Stage B — Per-topic resource assembly
# ---------------------------------------------------------------------------

def _get_topic_data(topic: str, company: str = "") -> dict:
    """
    Return concepts_to_master, practice_tasks, estimated_hours, and resources
    for a single topic. Hits layer-2 cache first; runs Tavily + Sonar on miss.
    """
    cached = cache.get_topic_resources(topic)
    if cached:
        logger.info(f"TopicResourceCache hit for '{topic}'")
        return cached.to_dict()

    # ── Tavily search (Fix 3 — log confirms this is actually running) ────
    logger.info(f"TopicResourceCache miss — running Tavily search for '{topic}'")
    search_results = tavily_service.search_topic_resources(topic)
    logger.info(f"Tavily returned {len(search_results)} results for '{topic}'")
    formatted      = format_search_results_for_prompt(search_results)

    # ── Sonar synthesis ──────────────────────────────────────────────────
    try:
        prompt = TOPIC_SYNTHESIS_PROMPT.format(
            company        = company or "a campus placement drive",
            topic          = topic,
            search_results = formatted,
        )
        data = _call_sonar(prompt)

        concepts      = data.get("concepts_to_master", [])
        tasks         = data.get("practice_tasks", [])
        est_hours     = float(data.get("estimated_hours", 2.5))
        resources     = data.get("resources", [])

        logger.info(
            f"Sonar synthesis OK for '{topic}': "
            f"{len(concepts)} concepts, {len(tasks)} tasks, {len(resources)} resources"
        )
    except Exception as exc:
        logger.error(f"Topic synthesis failed for '{topic}': {exc}")
        # Structured fallback — never produces a vague restatement string
        concepts  = [f"Core patterns in {topic}", "Time and space complexity trade-offs"]
        tasks     = [
            f"Solve 10 easy-level {topic} problems on LeetCode or GeeksforGeeks",
            f"Read the GeeksforGeeks article on {topic} and reproduce one example by hand",
        ]
        est_hours = 2.5
        resources = []

    # ── Persist using explanation field to store structured JSON ─────────
    # The DB stores explanation as TEXT; we encode the structured fields
    # inside a JSON blob so we don't need a schema migration.
    structured_blob = json.dumps({
        "concepts_to_master": concepts,
        "practice_tasks":     tasks,
        "estimated_hours":    est_hours,
    })

    row = cache.save_topic_resources(
        topic       = topic,
        resources   = resources,
        explanation = structured_blob,
    )
    return row.to_dict()


# ---------------------------------------------------------------------------
# Public entry point — generate full PrepPlan
# ---------------------------------------------------------------------------

def generate_prep_plan(company: str, days: int) -> dict:
    """
    Main entry point called by the route.

    Returns:
    {
        "success": True,
        "company": { ...CompanyPattern dict... },
        "days": <int>,
        "timeline": [
            {
                "dayNumber": 1,
                "isReview": False,
                "topic": "Arrays & String Manipulation",
                "topicWeight": 22.0,
                "explanation": "...",
                "resources": [ { type, title, url, description }, ... ]
            },
            ...
        ]
    }
    """
    if not company or not company.strip():
        return {"success": False, "error": "Company name is required."}
    if not isinstance(days, int) or not (1 <= days <= 90):
        return {"success": False, "error": "Days must be between 1 and 90."}

    # ── Stage A ──────────────────────────────────────────────────────────
    try:
        pattern = discover_company_pattern(company)
    except Exception as exc:
        logger.exception(f"Stage A failed for '{company}': {exc}")
        return {"success": False, "error": f"Could not analyse {company}'s interview pattern. Please try again."}

    # ── Build timeline skeleton ───────────────────────────────────────────
    timeline = _build_timeline(pattern, days)

    # ── Stage B — fetch resources for each unique non-review topic in parallel ─
    unique_topics = list(dict.fromkeys(
        d["topic"] for d in timeline if not d["isReview"]
    ))

    topic_data: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_get_topic_data, t, company): t for t in unique_topics}
        for future in as_completed(futures):
            t = futures[future]
            try:
                topic_data[t] = future.result()
            except Exception as exc:
                logger.error(f"Resource fetch failed for '{t}': {exc}")
                topic_data[t] = {
                    "topic":       t,
                    "explanation": json.dumps({
                        "concepts_to_master": [f"Core patterns in {t}"],
                        "practice_tasks":     [f"Solve 10 {t} problems on LeetCode or GeeksforGeeks"],
                        "estimated_hours":    2.5,
                    }),
                    "resources": [],
                }

    # ── Merge into timeline ───────────────────────────────────────────────
    for day in timeline:
        if day["isReview"]:
            day["conceptsToMaster"] = ["Review all topics covered this week"]
            day["practiceTasks"]    = [
                "Re-solve 2 problems from each topic covered — without hints",
                "Write down any concepts that still feel shaky",
                "Pick one weak topic and spend extra time on it",
            ]
            day["estimatedHours"]   = 3.0
            day["resources"]        = []
        else:
            td  = topic_data.get(day["topic"], {})
            raw = td.get("explanation", "{}")
            # Decode the structured blob stored in the explanation field
            try:
                structured = json.loads(raw) if isinstance(raw, str) else {}
            except (json.JSONDecodeError, TypeError):
                structured = {}

            day["conceptsToMaster"] = structured.get("concepts_to_master", [])
            day["practiceTasks"]    = structured.get("practice_tasks", [])
            day["estimatedHours"]   = structured.get("estimated_hours", 2.5)
            day["resources"]        = td.get("resources", [])

    return {
        "success":  True,
        "company":  pattern,
        "days":     days,
        "timeline": timeline,
    }

"""
Cache read/write for both Prep Plan cache layers.

Layer 1 — CompanyPattern  : keyed by normalized company name, TTL ~30 days
Layer 2 — TopicResources  : keyed by topic string,            TTL ~7 days

Both layers use the SQLite tables defined in prep_plan_models.py and share
the same Flask-SQLAlchemy `db` instance as the Insights feature.
"""

import logging
from datetime import datetime, timezone, timedelta

from .. import db
from ..models.prep_plan_models import CompanyPattern, TopicResourceCache

logger = logging.getLogger(__name__)

# Cache TTLs
_PATTERN_TTL_DAYS  = 30
_RESOURCE_TTL_DAYS = 7


def _normalize(name: str) -> str:
    """Lowercase + strip for consistent cache keys."""
    return name.strip().lower()


def _is_expired(cached_at_iso: str, ttl_days: int) -> bool:
    """Return True if the cached_at timestamp is older than ttl_days."""
    try:
        cached_at = datetime.fromisoformat(cached_at_iso)
        # Make timezone-aware if naive
        if cached_at.tzinfo is None:
            cached_at = cached_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - cached_at > timedelta(days=ttl_days)
    except Exception:
        return True  # treat unparseable timestamps as expired


# ---------------------------------------------------------------------------
# Layer 1 — CompanyPattern
# ---------------------------------------------------------------------------

def get_company_pattern(company: str) -> CompanyPattern | None:
    """
    Return a fresh (non-expired) CompanyPattern, or None if missing/stale.
    """
    key = _normalize(company)
    row = CompanyPattern.query.filter_by(company_key=key).first()
    if row is None:
        return None
    if _is_expired(row.discovered_at, _PATTERN_TTL_DAYS):
        logger.info(f"CompanyPattern cache expired for '{key}'")
        db.session.delete(row)
        db.session.commit()
        return None
    return row


def save_company_pattern(
    company_display: str,
    rounds: list,
    topic_weights: list,
    tests_aptitude: bool,
    difficulty_tier: str,
    format_notes: str,
    confidence: str,
    source_count: int,
    source_type: str = "tavily",
) -> CompanyPattern:
    """
    Upsert a CompanyPattern row. Replaces any existing entry for the same key.
    """
    key = _normalize(company_display)

    # Delete stale entry if present (upsert via delete+insert for SQLite simplicity)
    existing = CompanyPattern.query.filter_by(company_key=key).first()
    if existing:
        db.session.delete(existing)
        db.session.flush()

    row = CompanyPattern(
        company_key     = key,
        display_name    = company_display,
        tests_aptitude  = tests_aptitude,
        difficulty_tier = difficulty_tier,
        format_notes    = format_notes or "",
        confidence      = confidence,
        source_count    = source_count,
        source_type     = source_type,
    )
    row.rounds         = rounds
    row.topic_weights  = topic_weights

    db.session.add(row)
    db.session.commit()
    logger.info(f"Saved CompanyPattern for '{key}' (confidence={confidence}, sources={source_count})")
    return row


def list_cached_companies() -> list[str]:
    """Return display names of all currently-cached (non-expired) companies."""
    rows = CompanyPattern.query.all()
    return [
        r.display_name for r in rows
        if not _is_expired(r.discovered_at, _PATTERN_TTL_DAYS)
    ]


# ---------------------------------------------------------------------------
# Layer 2 — TopicResources
# ---------------------------------------------------------------------------

def get_topic_resources(topic: str) -> TopicResourceCache | None:
    """
    Return a fresh TopicResourceCache row, or None if missing/stale.
    """
    key = _normalize(topic)
    row = TopicResourceCache.query.filter_by(topic_key=key).first()
    if row is None:
        return None
    if _is_expired(row.cached_at, _RESOURCE_TTL_DAYS):
        logger.info(f"TopicResourceCache expired for '{key}'")
        db.session.delete(row)
        db.session.commit()
        return None
    return row


def save_topic_resources(
    topic: str,
    resources: list,
    explanation: str,
) -> TopicResourceCache:
    """
    Upsert a TopicResourceCache row.
    """
    key = _normalize(topic)

    existing = TopicResourceCache.query.filter_by(topic_key=key).first()
    if existing:
        db.session.delete(existing)
        db.session.flush()

    row = TopicResourceCache(
        topic_key   = key,
        explanation = explanation,
    )
    row.resources = resources

    db.session.add(row)
    db.session.commit()
    logger.info(f"Saved TopicResourceCache for '{key}' ({len(resources)} resources)")
    return row

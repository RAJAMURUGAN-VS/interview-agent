"""
SQLAlchemy models for the Prep Plan feature.

Two cache tables:
  - company_patterns     : Stage A cache — CompanyPattern per company (~30d TTL)
  - topic_resources_cache: Stage B cache — per-topic resource bundles (~7d TTL)

All list/dict fields are stored as JSON TEXT columns (SQLite supports this
natively), matching the same pattern as insights_models.py.
"""

import json
import uuid
from datetime import datetime, timezone

from .. import db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Stage A cache — CompanyPattern
# ---------------------------------------------------------------------------

class CompanyPattern(db.Model):
    __tablename__ = "company_patterns"

    id                 = db.Column(db.String(36),  primary_key=True, default=_new_id)
    # Normalized lowercase key for lookups, e.g. "infosys"
    company_key        = db.Column(db.String(120), nullable=False, unique=True, index=True)
    display_name       = db.Column(db.String(120), nullable=False)
    discovered_at      = db.Column(db.String(40),  nullable=False, default=_now_iso)

    # JSON columns
    rounds_json        = db.Column(db.Text, nullable=False, default="[]")
    topic_weights_json = db.Column(db.Text, nullable=False, default="[]")

    tests_aptitude     = db.Column(db.Boolean, nullable=False, default=False)
    difficulty_tier    = db.Column(db.String(20),  nullable=False, default="Medium")
    format_notes       = db.Column(db.Text,        nullable=True)
    confidence         = db.Column(db.String(10),  nullable=False, default="medium")
    source_count       = db.Column(db.Integer,     nullable=False, default=0)

    # Optional: which signals contributed to this pattern
    # 'tavily' | 'senior_insights' | 'blended'
    source_type        = db.Column(db.String(20),  nullable=False, default="tavily")

    # ── JSON properties ──────────────────────────────────────────────────

    @property
    def rounds(self) -> list:
        return json.loads(self.rounds_json)

    @rounds.setter
    def rounds(self, value: list):
        self.rounds_json = json.dumps(value)

    @property
    def topic_weights(self) -> list:
        return json.loads(self.topic_weights_json)

    @topic_weights.setter
    def topic_weights(self, value: list):
        self.topic_weights_json = json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "companyName":    self.company_key,
            "displayName":    self.display_name,
            "discoveredAt":   self.discovered_at,
            "rounds":         self.rounds,
            "topicWeights":   self.topic_weights,
            "testsAptitude":  self.tests_aptitude,
            "difficultyTier": self.difficulty_tier,
            "formatNotes":    self.format_notes or "",
            "confidence":     self.confidence,
            "sourceCount":    self.source_count,
            "sourceType":     self.source_type,
        }


# ---------------------------------------------------------------------------
# Stage B cache — per-topic resource bundles
# ---------------------------------------------------------------------------

class TopicResourceCache(db.Model):
    __tablename__ = "topic_resources_cache"

    id           = db.Column(db.String(36), primary_key=True, default=_new_id)
    # Cache key: "{topic}" (company-agnostic — resources for "Hashing" are universal)
    topic_key    = db.Column(db.String(200), nullable=False, unique=True, index=True)
    cached_at    = db.Column(db.String(40),  nullable=False, default=_now_iso)

    # JSON list of ResourceLink objects
    resources_json = db.Column(db.Text, nullable=False, default="[]")

    # Short AI-generated explanation for this topic
    explanation    = db.Column(db.Text, nullable=True)

    @property
    def resources(self) -> list:
        return json.loads(self.resources_json)

    @resources.setter
    def resources(self, value: list):
        self.resources_json = json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "topic":       self.topic_key,
            "cachedAt":    self.cached_at,
            "explanation": self.explanation or "",
            "resources":   self.resources,
        }

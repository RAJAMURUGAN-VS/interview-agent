"""
SQLAlchemy models for the Insights feature.

Two tables:
  - interview_experiences
  - preparation_strategies

JSON columns (supported natively by SQLite via TEXT + json) store
list fields (rounds, codingPlatforms, etc.) to keep the schema flat
and avoid join tables for a feature this scoped.
"""

import uuid
import json
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
# Models
# ---------------------------------------------------------------------------

class InterviewExperience(db.Model):
    __tablename__ = "interview_experiences"

    id            = db.Column(db.String(36),  primary_key=True, default=_new_id)
    company       = db.Column(db.String(120), nullable=False, index=True)
    role          = db.Column(db.String(200), nullable=False)
    department    = db.Column(db.String(20),  nullable=False)   # CSE / ECE / AIML / IT / CSBS / Other
    offer_type    = db.Column(db.String(20),  nullable=False)   # On-Campus / Off-Campus / Internship / Full-Time
    difficulty    = db.Column(db.Integer,     nullable=False)   # 1–5
    outcome       = db.Column(db.String(20),  nullable=False)   # Selected / Rejected / Waiting
    rounds_json   = db.Column(db.Text,        nullable=False, default="[]")
    tips          = db.Column(db.Text,        nullable=True)
    posted_at     = db.Column(db.String(40),  nullable=False, default=_now_iso)
    upvotes       = db.Column(db.Integer,     nullable=False, default=0)
    author_alias  = db.Column(db.String(60),  nullable=False)
    reported      = db.Column(db.Boolean,     nullable=False, default=False)

    # ------------------------------------------------------------------
    # Convenience properties
    # ------------------------------------------------------------------
    @property
    def rounds(self):
        return json.loads(self.rounds_json)

    @rounds.setter
    def rounds(self, value):
        self.rounds_json = json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "id":           self.id,
            "company":      self.company,
            "role":         self.role,
            "department":   self.department,
            "offerType":    self.offer_type,
            "difficulty":   self.difficulty,
            "outcome":      self.outcome,
            "rounds":       self.rounds,
            "tips":         self.tips or "",
            "postedAt":     self.posted_at,
            "upvotes":      self.upvotes,
            "authorAlias":  self.author_alias,
        }


class PreparationStrategy(db.Model):
    __tablename__ = "preparation_strategies"

    id                    = db.Column(db.String(36),  primary_key=True, default=_new_id)
    company               = db.Column(db.String(120), nullable=False, index=True)
    role                  = db.Column(db.String(200), nullable=False)
    department            = db.Column(db.String(20),  nullable=False)
    prep_duration_weeks   = db.Column(db.Integer,     nullable=False)
    coding_platforms_json = db.Column(db.Text,        nullable=False, default="[]")
    study_materials_json  = db.Column(db.Text,        nullable=False, default="[]")
    youtube_channels_json = db.Column(db.Text,        nullable=False, default="[]")
    daily_routine         = db.Column(db.Text,        nullable=True)
    advice                = db.Column(db.Text,        nullable=False)
    posted_at             = db.Column(db.String(40),  nullable=False, default=_now_iso)
    upvotes               = db.Column(db.Integer,     nullable=False, default=0)
    author_alias          = db.Column(db.String(60),  nullable=False)
    reported              = db.Column(db.Boolean,     nullable=False, default=False)

    @property
    def coding_platforms(self):
        return json.loads(self.coding_platforms_json)

    @coding_platforms.setter
    def coding_platforms(self, value):
        self.coding_platforms_json = json.dumps(value)

    @property
    def study_materials(self):
        return json.loads(self.study_materials_json)

    @study_materials.setter
    def study_materials(self, value):
        self.study_materials_json = json.dumps(value)

    @property
    def youtube_channels(self):
        return json.loads(self.youtube_channels_json)

    @youtube_channels.setter
    def youtube_channels(self, value):
        self.youtube_channels_json = json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "id":                self.id,
            "company":           self.company,
            "role":              self.role,
            "department":        self.department,
            "prepDurationWeeks": self.prep_duration_weeks,
            "codingPlatforms":   self.coding_platforms,
            "studyMaterials":    self.study_materials,
            "youtubeChannels":   self.youtube_channels,
            "dailyRoutine":      self.daily_routine or "",
            "advice":            self.advice,
            "postedAt":          self.posted_at,
            "upvotes":           self.upvotes,
            "authorAlias":       self.author_alias,
        }


# ---------------------------------------------------------------------------
# Seed data — 4 realistic companies, split into experience + prep posts
# ---------------------------------------------------------------------------

SEED_EXPERIENCES = [
    {
        "id": "exp-inf-001",
        "company": "Infosys",
        "role": "Systems Engineer",
        "department": "CSE",
        "offer_type": "On-Campus",
        "difficulty": 2,
        "outcome": "Selected",
        "rounds": [
            {
                "roundName": "Online Assessment",
                "description": "Aptitude + reasoning + a 30-minute coding section on HackerRank. Two medium-difficulty array problems. Most people passed with basic DSA prep.",
            },
            {
                "roundName": "HR + Technical Interview",
                "description": "Conversational — projects, resume walkthrough, why Infosys. One SQL query question (GROUP BY with HAVING). No stress, panel was friendly.",
            },
        ],
        "tips": "Focus on verbal reasoning and basic coding. The bar is lower than product companies — consistency matters more than difficulty.",
        "author_alias": "CSE '25 Alum",
    },
    {
        "id": "exp-wip-001",
        "company": "Wipro",
        "role": "Project Engineer",
        "department": "ECE",
        "offer_type": "On-Campus",
        "difficulty": 2,
        "outcome": "Selected",
        "rounds": [
            {
                "roundName": "NLTH Exam",
                "description": "National Level Talent Hunt — aptitude, English, coding. Prepare for percentage problems, series completion, and writing correct code (not just pseudocode).",
            },
            {
                "roundName": "Technical Interview",
                "description": "Basic OOPS questions, OS concepts (process vs thread), and a C++ pointer question. Very fundamental — revise your semester subjects.",
            },
            {
                "roundName": "HR Interview",
                "description": "Standard HR round. Asked about relocation, strengths, and a 'tell me about yourself'. 15 minutes.",
            },
        ],
        "tips": "Don't overthink it. NLTH is the real filter. After that the interviews are polite and predictable.",
        "author_alias": "ECE '24 Alum",
    },
    {
        "id": "exp-hex-001",
        "company": "Hexaware",
        "role": "Digital Nurture 5.0 - Java FSE",
        "department": "CSE",
        "offer_type": "On-Campus",
        "difficulty": 3,
        "outcome": "Selected",
        "rounds": [
            {
                "roundName": "Aptitude + Coding Test",
                "description": "45 min aptitude (quant, logical, verbal) + 30 min coding. Two problems: reverse a linked list, count vowels in a string. Medium difficulty.",
            },
            {
                "roundName": "Group Discussion",
                "description": "Topic: 'AI replacing jobs'. 8 people per group, 10 minutes. Don't dominate — let others speak. They observe communication and logical structuring.",
            },
            {
                "roundName": "Technical Interview",
                "description": "OOP concepts, Java specifically — polymorphism, interfaces vs abstract classes, collections framework. Also asked about Spring Boot basics and SQL joins.",
            },
        ],
        "tips": "Java FSE track heavily focuses on Spring ecosystem. Even surface-level Spring Boot knowledge helps in the technical round.",
        "author_alias": "CSE '25 Alum",
    },
    {
        "id": "exp-cap-001",
        "company": "Capgemini",
        "role": "Analyst",
        "department": "IT",
        "offer_type": "On-Campus",
        "difficulty": 3,
        "outcome": "Selected",
        "rounds": [
            {
                "roundName": "Game-Based Assessment",
                "description": "Unique to Capgemini — cognitive and personality games. No preparation needed; tests attention, memory, problem solving speed. Takes ~45 minutes.",
            },
            {
                "roundName": "Technical + Behavioural Interview",
                "description": "Mixed round. Technical: DBMS normalization, Python list comprehensions, REST API concepts. Behavioural: STAR format — tell me about a team project.",
            },
        ],
        "tips": "The game assessment is where candidates are usually eliminated. Don't rush — accuracy matters more than speed in the spatial reasoning games.",
        "author_alias": "IT '24 Alum",
    },
    {
        "id": "exp-zoh-001",
        "company": "Zoho",
        "role": "Software Engineer",
        "department": "CSE",
        "offer_type": "On-Campus",
        "difficulty": 4,
        "outcome": "Selected",
        "rounds": [
            {
                "roundName": "Written Test (Programming)",
                "description": "Pure C programming, data structures, and algorithms on paper. No IDE. They check logic, not just output. Practice writing code without autocomplete.",
            },
            {
                "roundName": "Advanced Programming Round",
                "description": "Live coding session with a problem given verbally. Mine was: implement a hash map from scratch in C. Panel watches your approach, not just the answer.",
            },
            {
                "roundName": "Technical Interview 1",
                "description": "Deep dive into your projects. They ask 'why' at every step. Be ready to defend every line of code in your capstone.",
            },
            {
                "roundName": "Technical Interview 2 + HR",
                "description": "OS, compilers, networking fundamentals. Also product thinking — 'if you were building a CRM, what would you prioritise?'.",
            },
        ],
        "tips": "Zoho is hard. Practice writing code on paper. They genuinely want problem solvers, not just people who memorised interview patterns.",
        "author_alias": "CSE '24 Alum",
    },
]

SEED_PREPARATIONS = [
    {
        "id": "prep-inf-001",
        "company": "Infosys",
        "role": "Systems Engineer",
        "department": "CSE",
        "prep_duration_weeks": 3,
        "coding_platforms": ["HackerRank", "GeeksforGeeks"],
        "study_materials": ["IndiaBix Aptitude", "R.S. Aggarwal Quantitative"],
        "youtube_channels": ["Apna College"],
        "daily_routine": "1 hour aptitude, 30 min coding problems (easy), 30 min reading company FAQs",
        "advice": "Infosys is a volume game. Revise basic aptitude, know your resume cold, and practice one SQL query per day for 2 weeks. That's genuinely all you need.",
        "author_alias": "CSE '25 Alum",
    },
    {
        "id": "prep-wip-001",
        "company": "Wipro",
        "role": "Project Engineer",
        "department": "ECE",
        "prep_duration_weeks": 4,
        "coding_platforms": ["HackerRank", "W3Schools"],
        "study_materials": ["IndiaBix", "GATE previous papers (aptitude section only)"],
        "youtube_channels": ["Knowledge Gate", "Gate Smashers"],
        "daily_routine": "45 min aptitude + 1 verbal mock + 1 coding problem",
        "advice": "For ECE folks, the coding section is the hardest part. Focus on C basics — pointers, arrays, basic sorting. Don't skip the verbal section; the NLTH English part eliminates a lot of people.",
        "author_alias": "ECE '24 Alum",
    },
    {
        "id": "prep-hex-001",
        "company": "Hexaware",
        "role": "Digital Nurture 5.0 - Java FSE",
        "department": "CSE",
        "prep_duration_weeks": 6,
        "coding_platforms": ["LeetCode", "GeeksforGeeks", "HackerRank"],
        "study_materials": ["Head First Java", "Java Brains Spring Boot playlist", "W3Schools SQL"],
        "youtube_channels": ["Java Brains", "Telusko", "Apna College"],
        "daily_routine": "2 LeetCode easy/medium problems + 30 min Java concepts + 20 min SQL practice",
        "advice": "Learn Spring Boot basics from Java Brains — just Dependency Injection, REST controllers, and one CRUD example is enough. It signals you're serious about the Java FSE track.",
        "author_alias": "CSE '25 Alum",
    },
    {
        "id": "prep-cap-001",
        "company": "Capgemini",
        "role": "Analyst",
        "department": "IT",
        "prep_duration_weeks": 4,
        "coding_platforms": ["GeeksforGeeks", "HackerRank"],
        "study_materials": ["Cracking the Coding Interview (first 5 chapters)", "DBMS notes from college"],
        "youtube_channels": ["CS Dojo", "Apna College"],
        "daily_routine": "30 min game-based aptitude practice (apps like Elevate or Lumosity to warm up), 1 hour technical revision",
        "advice": "Take the game assessment seriously — that is where most candidates drop out. For the interview, practice STAR format answers out loud; Capgemini interviewers score you on communication as much as content.",
        "author_alias": "IT '24 Alum",
    },
    {
        "id": "prep-zoh-001",
        "company": "Zoho",
        "role": "Software Engineer",
        "department": "CSE",
        "prep_duration_weeks": 12,
        "coding_platforms": ["LeetCode", "Codeforces", "GeeksforGeeks"],
        "study_materials": ["The C Programming Language (K&R)", "CLRS Introduction to Algorithms", "Operating Systems: Three Easy Pieces"],
        "youtube_channels": ["Abdul Bari", "Kunal Kushwaha", "MIT OpenCourseWare"],
        "daily_routine": "3 LeetCode problems + 1 hour DS theory + 30 min write code on paper (no IDE)",
        "advice": "Start early. Zoho's bar is product-company level. The most important skill is writing code by hand — they literally give you paper. Practice that daily from week 1.",
        "author_alias": "CSE '24 Alum",
    },
]


def seed_db():
    """Insert seed rows only when the tables are empty."""
    from .insights_models import InterviewExperience, PreparationStrategy

    if InterviewExperience.query.count() == 0:
        for data in SEED_EXPERIENCES:
            rounds = data.pop("rounds")
            exp = InterviewExperience(**data)
            exp.rounds = rounds
            db.session.add(exp)

    if PreparationStrategy.query.count() == 0:
        for data in SEED_PREPARATIONS:
            coding = data.pop("coding_platforms")
            materials = data.pop("study_materials")
            channels = data.pop("youtube_channels")
            prep = PreparationStrategy(**data)
            prep.coding_platforms = coding
            prep.study_materials = materials
            prep.youtube_channels = channels
            db.session.add(prep)

    db.session.commit()

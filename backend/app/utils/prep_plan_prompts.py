"""
LLM prompts for the Prep Plan feature.

Two prompts:
  PATTERN_DISCOVERY_PROMPT  — sent to Perplexity Sonar along with Tavily
                               search results; returns a CompanyPattern JSON
  TOPIC_SYNTHESIS_PROMPT    — sent to Perplexity Sonar along with Tavily
                               resource results; returns explanation + links
                               for a single prep topic

Both prompts enforce strict JSON-only output, stripping markdown fences
defensively in the service layer (same convention as mcq_prompts.py and
doubt_solver_prompts.py).
"""

# ---------------------------------------------------------------------------
# Stage A — Company interview pattern discovery
# ---------------------------------------------------------------------------

PATTERN_DISCOVERY_PROMPT = """You are an expert placement consultant who has analyzed hundreds of Indian campus recruitment drives.

Below are web search results about {company_name}'s placement/interview process collected from multiple angles.
Study them carefully and extract a structured profile.

SEARCH RESULTS:
{search_results}

Your task: Return a single JSON object (and ONLY that JSON — no markdown, no fences, no text before or after) that captures:
1. The interview rounds this company runs, in order
2. Whether the company tests aptitude/quant/logical reasoning (be precise — if sources don't mention an aptitude test, set testsAptitude to false)
3. The CS/coding topics that appear most in their rounds, weighted by frequency + importance
4. The overall difficulty of their process
5. Any format-specific notes (e.g. "written C programs on paper", "online HackerRank", "GD round")

CRITICAL RULES:
- If sources do NOT mention an aptitude/quant/logical reasoning round, set "testsAptitude": false and do NOT include aptitude topics in topicWeights
- Only include topics actually mentioned or strongly implied by the sources
- If sources are sparse (fewer than 3 distinct references), set "confidence": "low"
- difficultyTier must be exactly one of: "Easy", "Easy-Medium", "Medium", "Medium-High", "High"
- topic weights must sum to approximately 100; each weight is the % of prep time to allocate
- Return ONLY the JSON below — nothing else

{{
  "displayName": "{company_name}",
  "rounds": [
    {{
      "order": 1,
      "name": "string (e.g. Online Assessment, Technical Interview)",
      "testsAptitude": false,
      "description": "string (1-2 sentences summarising what this round tests)"
    }}
  ],
  "testsAptitude": false,
  "topicWeights": [
    {{"topic": "Arrays & String Manipulation", "weight": 20}},
    {{"topic": "Hashing & Maps", "weight": 15}}
  ],
  "difficultyTier": "Medium",
  "formatNotes": "string (key format details, or empty string if nothing notable)",
  "confidence": "high",
  "sourceCount": 0
}}
"""

# Fallback generic CS-fresher pattern used when Tavily finds < 3 sources
# The service substitutes the company display name and returns this directly
# without a Sonar call, to avoid wasting API quota on empty results.
FALLBACK_PATTERN = {
    "rounds": [
        {
            "order": 1,
            "name": "Online Assessment",
            "testsAptitude": False,
            "description": "Typically includes a coding section with 1-3 DSA problems.",
        },
        {
            "order": 2,
            "name": "Technical Interview",
            "testsAptitude": False,
            "description": "Covers DSA, OOP, and project-based questions.",
        },
        {
            "order": 3,
            "name": "HR Interview",
            "testsAptitude": False,
            "description": "Communication, behavioral questions, and culture fit.",
        },
    ],
    "testsAptitude": False,
    "topicWeights": [
        {"topic": "Arrays & String Manipulation", "weight": 22},
        {"topic": "Hashing & Maps",               "weight": 15},
        {"topic": "Sorting & Searching",           "weight": 12},
        {"topic": "Linked Lists",                  "weight": 10},
        {"topic": "Recursion & Backtracking",      "weight": 10},
        {"topic": "OOP Concepts",                  "weight": 10},
        {"topic": "Trees & Graphs (Basics)",       "weight": 8},
        {"topic": "SQL & Databases (Basics)",      "weight": 8},
        {"topic": "OS & Networking (Basics)",      "weight": 5},
    ],
    "difficultyTier": "Medium",
    "formatNotes": "",
    "confidence": "low",
    "sourceCount": 0,
}

# ---------------------------------------------------------------------------
# Stage B — Per-topic actionable day plan synthesis
# ---------------------------------------------------------------------------

TOPIC_SYNTHESIS_PROMPT = """You are building ONE DAY of a placement prep schedule for a student preparing for {company}. Today's focus topic is: {topic}.

You have been given real web search results below about this topic and this company's expectations.
Use them to ground your answer — do not write generic advice that could apply to any topic.

SEARCH RESULTS:
{search_results}

Return a JSON object with EXACTLY these fields (ONLY the JSON — no markdown fences, no text before or after):

{{
  "concepts_to_master": [
    "string — a specific sub-skill within this topic (NOT the topic name repeated)",
    "string — another sub-skill",
    "string — another sub-skill"
  ],
  "practice_tasks": [
    "string — a concrete, countable assignment with a problem type AND quantity",
    "string — another assignment",
    "string — another assignment"
  ],
  "estimated_hours": 2.5,
  "resources": [
    {{
      "type": "youtube",
      "title": "string",
      "url": "string (must start with https://)",
      "description": "string (one line: what this covers)"
    }}
  ]
}}

RULES — read carefully, every rule is load-bearing:

concepts_to_master (3-6 items):
- Each item is a specific sub-skill, NOT the topic name restated.
- BAD: "Verbal Ability"  GOOD: "Reading comprehension under time pressure"
- BAD: "Arrays"          GOOD: "Two-pointer technique for subarray problems"
- BAD: "Hashing"         GOOD: "Detecting duplicates with a hash set in O(n)"

practice_tasks (3-5 items):
- Each task must name a SPECIFIC problem type AND include an approximate count.
- BAD: "Practice problems on this topic"
- BAD: "Solve some array questions"
- GOOD: "Solve 10 two-pointer problems on LeetCode (Easy/Medium) — focus on sliding window"
- GOOD: "Complete 20 sentence-correction MCQs on IndiaBix covering subject-verb agreement"
- If {company} has a known format quirk for this topic (e.g. full programs not stubs, MCQs under 60 seconds, Versant spoken English), reflect that EXPLICITLY in one of the tasks.

estimated_hours:
- A realistic number between 1.5 and 5.0 for a single day of focused prep.

resources:
- ONLY include resources whose URLs actually appear in the search results above.
- Do NOT invent URLs or write "search for X on Y" as a resource.
- If fewer than 2 real URLs are present, return however many genuinely exist — an empty array is acceptable.
- YouTube links must come from youtube.com domains only.
- Resource type must be one of: "youtube", "article", "practice", "github", "docs"
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def format_search_results_for_prompt(results: list[dict]) -> str:
    """Convert a list of Tavily result dicts into a readable block for a prompt."""
    if not results:
        return "(No search results found)"

    lines = []
    for i, r in enumerate(results, 1):
        title   = r.get("title",   "Untitled")
        url     = r.get("url",     "")
        content = r.get("content", r.get("snippet", ""))
        source  = r.get("source",  "")

        lines.append(f"{i}. {title}")
        if source:
            lines.append(f"   Source: {source}")
        if url:
            lines.append(f"   URL: {url}")
        if content:
            lines.append(f"   Content: {content[:300]}...")
        lines.append("")

    return "\n".join(lines)

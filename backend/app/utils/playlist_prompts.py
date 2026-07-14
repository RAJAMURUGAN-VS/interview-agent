"""
Prompt templates for the Playlist Generator feature.

ROADMAP_GENERATION_PROMPT  — used in playlist_service.generate_roadmap()
VIDEO_SELECTION_PROMPT     — used in playlist_service._rank_and_select_videos()
"""

# ---------------------------------------------------------------------------
# Roadmap generation
# ---------------------------------------------------------------------------

ROADMAP_GENERATION_PROMPT = """\
You are a world-class curriculum designer specialising in technical education.

A learner wants to deeply understand the following topic in exactly the
specified total learning time:

  Topic:          {topic}
  Total minutes:  {duration_minutes}

Design a structured, progressive learning roadmap — ordered like a university
course syllabus — that covers the topic from fundamentals through to
intermediate/advanced/practical application.

CONSTRAINTS:
- Produce between 5 and 12 sections (inclusive). Never fewer than 5, never
  more than 12.
- Assign each section a `targetMinutes` value (integer). All `targetMinutes`
  values MUST sum to within 5% of {duration_minutes}.
- Sections must be ordered logically: prerequisite concepts first.
- Each section title must be short and specific (≤ 8 words).
- Each section description must explain what will be learned in that section
  and WHY it matters in the context of mastering the topic (2–3 sentences).

STRICT OUTPUT RULES:
- Respond with a single valid JSON array and nothing else.
- No markdown, no code fences (```), no explanation text outside the JSON.
- Every element of the array must exactly match the schema below.

JSON schema for each element:
{{
  "id":            "<string, unique, e.g. sec_1, sec_2, ...>",
  "title":         "<short section title>",
  "description":   "<2-3 sentence description of what is covered and why>",
  "order":         <integer, 1-based, must match position in array>,
  "targetMinutes": <integer, minutes allocated to this section>
}}
"""

# ---------------------------------------------------------------------------
# Video selection
# ---------------------------------------------------------------------------

VIDEO_SELECTION_PROMPT = """\
You are a senior learning experience designer. Your job is to select the
best YouTube video(s) from a list of candidates for each section of a
technical learning roadmap.

Topic: {topic}

ROADMAP SECTIONS (in order):
{sections_json}

VIDEO CANDIDATES (top-8 per section, already filtered for quality):
{candidates_json}

SELECTION RULES:
1. For each section, pick EXACTLY ONE video. You may pick a SECOND video
   ONLY if the section's `targetMinutes` is >= 45 AND the section covers
   a genuinely broad concept that benefits from two perspectives (e.g.
   "React Hooks" vs. "Introduction"). Two videos are optional, not required.
2. Prioritise pedagogical fit: the video must actually teach the concept
   listed in the section's `description`, not just be popular.
3. Consider sequence: a video picked for section N should logically follow
   what was taught in section N-1 and prepare for section N+1.
4. Never pick the same videoId twice across the entire playlist.
5. If no candidate is a good fit, pick the least-bad one — never leave a
   section empty.

STRICT OUTPUT RULES:
- Respond with a single valid JSON object and nothing else.
- No markdown, no code fences, no explanation text outside the JSON.
- Keys are sectionIds (e.g. "sec_1"). Values are arrays of videoId strings.

Example output format:
{{
  "sec_1": ["dQw4w9WgXcQ"],
  "sec_2": ["oHg5SJYRHA0", "kJQP7kiw5Fk"],
  "sec_3": ["dQw4w9WgXcQ_different"]
}}
"""

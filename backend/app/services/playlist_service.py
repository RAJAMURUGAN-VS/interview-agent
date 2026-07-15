"""
Playlist orchestration service.

Responsibilities:
  - generate_roadmap()         — LLM roadmap generation
  - start_generation_job()     — kick off a background generation thread
  - get_job()                  — return current job state (for status polling)

Background thread flow (per job):
  searching → ranking → awaiting_connection → creating_playlist → complete/error

Job cleanup: entries are evicted from memory after 1 hour via threading.Timer.
Partial-creation safety: videos_added tracks IDs already inserted so retries
don't duplicate items.
"""

import json
import logging
import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from langchain.chat_models import init_chat_model

from ..config import Config
from ..utils.playlist_prompts import ROADMAP_GENERATION_PROMPT, VIDEO_SELECTION_PROMPT
from . import youtube_search_service as yt
from . import pipedream_service as pd_svc
from . import youtube_oauth_service as yt_oauth
from .youtube_search_service import QuotaExceededError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM instance (same model as rest of app)
# ---------------------------------------------------------------------------
_model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY,
)

# ---------------------------------------------------------------------------
# Job state
# ---------------------------------------------------------------------------

@dataclass
class PlaylistJob:
    job_id: str
    phase: str                     # roadmap | searching | ranking | awaiting_connection | creating_playlist | complete | error
    target_duration_minutes: int
    external_user_id: str
    topic: str
    privacy: str

    roadmap: list[dict]            = field(default_factory=list)
    selected_videos: list[dict]    = field(default_factory=list)
    actual_duration_minutes: int | None = None
    playlist_url: str | None       = None
    error_message: str | None      = None

    # Partial-creation tracking
    playlist_id: str | None        = None
    videos_added: list[str]        = field(default_factory=list)   # videoIds already inserted

    created_at: float              = field(default_factory=time.time)


# In-memory store: job_id → PlaylistJob
_jobs: dict[str, PlaylistJob] = {}
_jobs_lock = threading.Lock()

# Job TTL: 1 hour (3600 seconds)
_JOB_TTL_SECONDS = 3600


def _schedule_cleanup(job_id: str) -> None:
    """Evict a job from memory after TTL expires."""
    def _do_cleanup():
        with _jobs_lock:
            _jobs.pop(job_id, None)
        logger.debug("Playlist job %s evicted from memory", job_id)

    t = threading.Timer(_JOB_TTL_SECONDS, _do_cleanup)
    t.daemon = True
    t.start()


def get_job(job_id: str) -> PlaylistJob | None:
    with _jobs_lock:
        return _jobs.get(job_id)


# ---------------------------------------------------------------------------
# Roadmap generation
# ---------------------------------------------------------------------------

def generate_roadmap(topic: str, duration_hours: float) -> list[dict]:
    """
    Generate a structured learning roadmap via the LLM.
    Returns a list of section dicts validated against the schema.
    Raises ValueError if the LLM response cannot be parsed or validated.
    """
    duration_minutes = int(duration_hours * 60)
    prompt = ROADMAP_GENERATION_PROMPT.format(
        topic=topic,
        duration_minutes=duration_minutes,
    )

    response = _model.invoke([{"role": "user", "content": prompt}])
    raw = response.content if hasattr(response, "content") else str(response)

    sections = _parse_json_response(raw)

    if not isinstance(sections, list):
        raise ValueError("Roadmap LLM response is not a JSON array")

    # Validate section count
    if not (5 <= len(sections) <= 12):
        raise ValueError(
            f"Roadmap must have 5–12 sections; got {len(sections)}"
        )

    # Validate total minutes within 5% tolerance
    total = sum(s.get("targetMinutes", 0) for s in sections)
    tolerance = 0.05 * duration_minutes
    if abs(total - duration_minutes) > tolerance:
        logger.warning(
            "Roadmap total minutes %d deviates from requested %d (tolerance %d). Adjusting.",
            total, duration_minutes, tolerance,
        )
        # Scale targetMinutes proportionally to hit the requested total
        ratio = duration_minutes / total if total else 1
        for s in sections:
            s["targetMinutes"] = max(1, round(s.get("targetMinutes", 10) * ratio))

    # Ensure required fields exist and order is correct
    for i, s in enumerate(sections):
        s.setdefault("id", f"sec_{i+1}")
        s.setdefault("title", f"Section {i+1}")
        s.setdefault("description", "")
        s["order"] = i + 1
        s.setdefault("targetMinutes", max(1, duration_minutes // len(sections)))

    return sections


# ---------------------------------------------------------------------------
# Generation job (background thread)
# ---------------------------------------------------------------------------

def start_generation_job(
    external_user_id: str,
    topic: str,
    duration_hours: float,
    roadmap: list[dict],
    privacy: str = "public",
) -> str:
    """
    Create a new job and spin up a background thread to process it.
    Returns the job_id.
    """
    job_id = str(uuid.uuid4())
    job = PlaylistJob(
        job_id=job_id,
        phase="searching",
        target_duration_minutes=int(duration_hours * 60),
        external_user_id=external_user_id,
        topic=topic,
        privacy=privacy,
        roadmap=roadmap,
    )

    with _jobs_lock:
        _jobs[job_id] = job

    _schedule_cleanup(job_id)

    thread = threading.Thread(
        target=_run_job,
        args=(job_id,),
        daemon=True,
        name=f"playlist-job-{job_id[:8]}",
    )
    thread.start()

    return job_id


def _update_job(job_id: str, **kwargs: Any) -> None:
    """Thread-safe job field update."""
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)


def _run_job(job_id: str) -> None:
    """
    Main background worker.
    Transitions: searching → ranking → awaiting_connection → creating_playlist → complete/error
    """
    job = get_job(job_id)
    if not job:
        return

    try:
        # ── Phase 1: Searching ──────────────────────────────────────────────
        _update_job(job_id, phase="searching")
        section_candidates: dict[str, list[dict]] = {}

        for section in job.roadmap:
            sec_id = section["id"]
            try:
                candidates = yt.search_section_candidates(
                    section_title=section["title"],
                    topic=job.topic,
                    target_minutes=section["targetMinutes"],
                    top_n=8,
                )
                section_candidates[sec_id] = candidates
            except QuotaExceededError:
                _update_job(
                    job_id,
                    phase="error",
                    error_message=(
                        "YouTube search quota exceeded. "
                        "Try again tomorrow (quota resets at midnight Pacific time)."
                    ),
                )
                return
            except Exception as exc:
                logger.error("Search error for section %s: %s", sec_id, exc)
                section_candidates[sec_id] = []   # skip this section

        # ── Phase 2: Ranking / LLM selection ───────────────────────────────
        _update_job(job_id, phase="ranking")
        selected_videos = _rank_and_select_videos(
            job.roadmap, section_candidates, job.topic, job.target_duration_minutes
        )

        actual_duration = sum(v.get("durationSeconds", 0) for v in selected_videos) // 60
        _update_job(
            job_id,
            selected_videos=selected_videos,
            actual_duration_minutes=actual_duration,
        )

        # ── Phase 3: Await account connection ──────────────────────────────
        _update_job(job_id, phase="awaiting_connection")
        # The frontend polls /connection-status and calls /generate again
        # (or the job simply waits here).  We poll internally with a timeout
        # of 5 minutes; frontend should have already advanced by then.
        connected = _wait_for_connection(job.external_user_id, timeout_seconds=300)
        if not connected:
            _update_job(
                job_id,
                phase="error",
                error_message=(
                    "YouTube account connection timed out. "
                    "Please reconnect and try again."
                ),
            )
            return

        # ── Phase 4: Create playlist ────────────────────────────────────────
        _update_job(job_id, phase="creating_playlist")

        # Create the playlist (or reuse existing if partial retry)
        if not job.playlist_id:
            description = _build_playlist_description(job.topic, job.roadmap)
            playlist_data = yt_oauth.create_youtube_playlist(
                external_user_id=job.external_user_id,
                title=f"{job.topic} — Learning Roadmap",
                description=description,
                privacy_status=job.privacy,
            )
            _update_job(job_id, playlist_id=playlist_data["playlist_id"])
            job = get_job(job_id)   # re-fetch after update

        # Add videos — skip any already added (retry safety)
        for position, video in enumerate(selected_videos):
            vid = video["videoId"]
            if vid in job.videos_added:
                continue
            yt_oauth.add_video_to_playlist(
                external_user_id=job.external_user_id,
                playlist_id=job.playlist_id,
                video_id=vid,
                position=position,
            )
            with _jobs_lock:
                j = _jobs.get(job_id)
                if j:
                    j.videos_added.append(vid)

        playlist_url = f"https://www.youtube.com/playlist?list={job.playlist_id}"
        _update_job(job_id, phase="complete", playlist_url=playlist_url)

    except Exception as exc:
        logger.exception("Playlist job %s failed: %s", job_id, exc)
        _update_job(
            job_id,
            phase="error",
            error_message=f"An unexpected error occurred: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# LLM video selection + duration fitting
# ---------------------------------------------------------------------------

def _rank_and_select_videos(
    roadmap: list[dict],
    section_candidates: dict[str, list[dict]],
    topic: str,
    target_minutes: int,
) -> list[dict]:
    """
    Single LLM call to pick the best 1–2 videos per section, followed by
    a duration-fitting adjustment loop (max 3 passes).
    Returns a flat, ordered list of SelectedVideo-shaped dicts.
    """
    # Build condensed candidate data for the prompt
    candidates_for_prompt: dict[str, list[dict]] = {}
    for section in roadmap:
        sec_id = section["id"]
        candidates = section_candidates.get(sec_id, [])
        candidates_for_prompt[sec_id] = [
            {
                "videoId":       c["videoId"],
                "title":         c["title"],
                "channelTitle":  c["channelTitle"],
                "durationSecs":  c["durationSeconds"],
                "viewCount":     c["viewCount"],
            }
            for c in candidates[:8]
        ]

    sections_json   = json.dumps(roadmap, indent=2)
    candidates_json = json.dumps(candidates_for_prompt, indent=2)

    prompt = VIDEO_SELECTION_PROMPT.format(
        topic=topic,
        sections_json=sections_json,
        candidates_json=candidates_json,
    )

    try:
        response = _model.invoke([{"role": "user", "content": prompt}])
        raw = response.content if hasattr(response, "content") else str(response)
        selection_map: dict[str, list[str]] = _parse_json_response(raw)
    except Exception as exc:
        logger.error("LLM video selection failed: %s — falling back to top-1 per section", exc)
        # Fall back: just pick the top-scored candidate per section
        selection_map = {
            section["id"]: [section_candidates[section["id"]][0]["videoId"]]
            for section in roadmap
            if section_candidates.get(section["id"])
        }

    # Build flat selected_videos list with position
    selected: list[dict] = []
    used_video_ids: set[str] = set()
    position = 0

    for section in roadmap:
        sec_id = section["id"]
        chosen_ids = selection_map.get(sec_id, [])
        pool = {c["videoId"]: c for c in section_candidates.get(sec_id, [])}

        # Filter out already-used video IDs
        chosen_ids = [vid for vid in chosen_ids if vid not in used_video_ids and vid in pool]

        # If LLM picked nothing valid, fall back to top-scored candidate
        if not chosen_ids and pool:
            fallback = next(iter(pool.values()))
            if fallback["videoId"] not in used_video_ids:
                chosen_ids = [fallback["videoId"]]

        for vid_id in chosen_ids[:2]:   # max 2 per section
            candidate = pool.get(vid_id)
            if not candidate:
                continue
            selected.append({
                **candidate,
                "sectionId": sec_id,
                "position":  position,
            })
            used_video_ids.add(vid_id)
            position += 1

    # ── Duration fitting (max 3 passes) ─────────────────────────────────────
    selected = _duration_fit(selected, section_candidates, target_minutes, roadmap)
    return selected


def _duration_fit(
    selected: list[dict],
    section_candidates: dict[str, list[dict]],
    target_minutes: int,
    roadmap: list[dict],
    max_passes: int = 3,
) -> list[dict]:
    """
    Iteratively swap longer/shorter candidates to bring actual total duration
    within ±15% of target. Accepts the closest result after max_passes.
    """
    tolerance_ratio = 0.15

    for pass_num in range(max_passes):
        actual = sum(v.get("durationSeconds", 0) for v in selected) / 60
        delta_ratio = (actual - target_minutes) / target_minutes if target_minutes else 0

        if abs(delta_ratio) <= tolerance_ratio:
            break   # within tolerance — done

        too_long = delta_ratio > 0   # actual > target, need shorter videos

        # Find the section with the largest contribution to the gap
        selected_by_section: dict[str, list[dict]] = {}
        for v in selected:
            selected_by_section.setdefault(v["sectionId"], []).append(v)

        swapped = False
        for section in roadmap:
            sec_id = section["id"]
            pool = section_candidates.get(sec_id, [])
            current_vids = selected_by_section.get(sec_id, [])
            if not current_vids or not pool:
                continue

            current_sec_dur = sum(v["durationSeconds"] for v in current_vids)
            used_ids = {v["videoId"] for v in selected}

            # Try to find a better-fitting candidate from the pool
            for candidate in sorted(pool, key=lambda c: c["durationSeconds"], reverse=not too_long):
                if candidate["videoId"] in used_ids:
                    continue
                cand_dur = candidate["durationSeconds"]
                if too_long and cand_dur < current_sec_dur:
                    # Swap: replace all videos in this section with this one shorter video
                    selected = [v for v in selected if v["sectionId"] != sec_id]
                    selected.append({
                        **candidate,
                        "sectionId": sec_id,
                        "position":  0,   # recalculated below
                    })
                    swapped = True
                    break
                elif not too_long and cand_dur > current_sec_dur:
                    selected = [v for v in selected if v["sectionId"] != sec_id]
                    selected.append({
                        **candidate,
                        "sectionId": sec_id,
                        "position":  0,
                    })
                    swapped = True
                    break
            if swapped:
                break

        if not swapped:
            break   # no improvement possible

    # Re-assign positions in roadmap section order
    section_order = {s["id"]: s["order"] for s in roadmap}
    selected.sort(key=lambda v: (section_order.get(v["sectionId"], 999), v.get("position", 0)))
    for i, v in enumerate(selected):
        v["position"] = i

    return selected


# ---------------------------------------------------------------------------
# Account connection polling helper
# ---------------------------------------------------------------------------

def _wait_for_connection(
    external_user_id: str,
    timeout_seconds: int = 300,
    poll_interval: int = 3,
) -> bool:
    """
    Poll until the user's YouTube account is connected (via Google OAuth
    or Pipedream), or until the timeout expires.
    """
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        # Check direct Google OAuth token first (faster)
        if yt_oauth.is_youtube_connected(external_user_id):
            return True
        # Fallback: Pipedream account check
        try:
            status = pd_svc.get_connected_account(external_user_id)
            if status.get("connected"):
                return True
        except Exception as exc:
            logger.warning("Connection poll error: %s", exc)
        time.sleep(poll_interval)

    return False


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _parse_json_response(raw: str) -> Any:
    """
    Strip markdown fences (```json ... ```) then parse JSON.
    Raises ValueError on parse failure.
    """
    cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse LLM JSON response: {exc}\nRaw:\n{cleaned[:500]}")


def _build_playlist_description(topic: str, roadmap: list[dict]) -> str:
    lines = [f"AI-generated learning roadmap for: {topic}", ""]
    for s in roadmap:
        lines.append(f"{s['order']}. {s['title']} (~{s.get('targetMinutes', 0)} min)")
    lines.append("")
    lines.append("Generated by PlacementPrep AI")
    return "\n".join(lines)

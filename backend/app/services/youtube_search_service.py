"""
YouTube Data API v3 wrapper — read-only, uses YOUTUBE_DATA_API_KEY.

Responsibilities:
  - search_videos()      → search.list (type=video, by relevance)
  - get_video_details()  → batched videos.list (contentDetails + statistics + snippet)
  - filter_candidates()  → remove Shorts, live streams, low-quality videos
  - score_candidates()   → rank by log(views) + search rank + duration-fit
"""

import math
import re
import logging
from typing import Any

import requests

from ..config import Config

logger = logging.getLogger(__name__)

# YouTube Data API v3 base URL
_YT_BASE = "https://www.googleapis.com/youtube/v3"

# Search quota cost: 100 units per call; videos.list = 1 unit per call (batched)
_API_KEY = Config.YOUTUBE_DATA_API_KEY


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def search_videos(query: str, max_results: int = 15) -> list[dict]:
    """
    Call search.list and return a list of raw search result items.
    Returns [] if the API key is not configured or the call fails.
    """
    if not _API_KEY or _API_KEY.startswith("YOUR_"):
        logger.warning("YOUTUBE_DATA_API_KEY not configured — returning empty search results")
        return []

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "order": "relevance",
        "maxResults": max_results,
        "videoDuration": "medium",   # 4–20 min; also captures 'long' via videos.list below
        "videoEmbeddable": "true",
        "key": _API_KEY,
    }
    try:
        resp = requests.get(f"{_YT_BASE}/search", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("items", [])
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response else None
        if status == 403:
            logger.error("YouTube search quota exceeded (403)")
            raise QuotaExceededError("YouTube search quota exceeded. Try again tomorrow.")
        logger.error("YouTube search.list HTTP error: %s", exc)
        return []
    except Exception as exc:
        logger.error("YouTube search.list error: %s", exc)
        return []


def get_video_details(video_ids: list[str]) -> list[dict]:
    """
    Batched videos.list call — fetches contentDetails, statistics, snippet
    for up to 50 video IDs in one request.
    Returns list of video resource dicts.
    """
    if not video_ids or not _API_KEY or _API_KEY.startswith("YOUR_"):
        return []

    # API allows max 50 ids per call; chunk if needed
    results: list[dict] = []
    for chunk_start in range(0, len(video_ids), 50):
        chunk = video_ids[chunk_start: chunk_start + 50]
        params = {
            "part": "contentDetails,statistics,snippet",
            "id": ",".join(chunk),
            "key": _API_KEY,
        }
        try:
            resp = requests.get(f"{_YT_BASE}/videos", params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("items", []))
        except Exception as exc:
            logger.error("YouTube videos.list error: %s", exc)
    return results


def parse_iso8601_duration(duration_str: str) -> int:
    """
    Convert ISO 8601 duration string (e.g. 'PT1H23M45S') to total seconds.
    Returns 0 if the string cannot be parsed.
    """
    if not duration_str:
        return 0
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
        duration_str,
    )
    if not match:
        return 0
    hours   = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def filter_candidates(video_details: list[dict]) -> list[dict]:
    """
    Remove videos that are:
    - Live streams or upcoming premieres
    - Duration < 3 min (not substantive)
    - Duration > 90 min (skews budget)
    - View count < 1,000 (quality proxy)
    Returns filtered list of video resource dicts.
    """
    filtered = []
    for v in video_details:
        content    = v.get("contentDetails", {})
        stats      = v.get("statistics", {})
        snippet    = v.get("snippet", {})

        # Skip live broadcasts
        live_status = content.get("licensedContent")  # not the right field
        broadcast   = snippet.get("liveBroadcastContent", "none")
        if broadcast in ("live", "upcoming"):
            continue

        # Duration filter
        duration_sec = parse_iso8601_duration(content.get("duration", ""))
        if duration_sec < 180 or duration_sec > 5400:   # 3 min – 90 min
            continue

        # View count filter
        try:
            view_count = int(stats.get("viewCount", 0))
        except (ValueError, TypeError):
            view_count = 0
        if view_count < 1000:
            continue

        filtered.append(v)
    return filtered


def score_candidates(
    video_details: list[dict],
    target_minutes: int,
    search_rank_map: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    """
    Score each candidate and return a sorted list (best first) of dicts:
    {
        videoId, title, channelTitle, durationSeconds, viewCount,
        thumbnailUrl, url, score
    }

    Scoring factors (all normalised to [0, 1] range before weighting):
      - log(viewCount + 1)  — popularity proxy           weight: 0.4
      - search rank         — relevance signal            weight: 0.3
      - duration fit        — abs(dur - target) / target  weight: 0.3
    """
    if not video_details:
        return []

    if search_rank_map is None:
        search_rank_map = {}

    # Gather raw metrics
    rows = []
    for v in video_details:
        vid        = v["id"]
        content    = v.get("contentDetails", {})
        stats      = v.get("statistics", {})
        snippet    = v.get("snippet", {})
        thumbnails = snippet.get("thumbnails", {})
        thumb_url  = (
            thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url", "")
        )

        duration_sec = parse_iso8601_duration(content.get("duration", ""))
        try:
            view_count = int(stats.get("viewCount", 0))
        except (ValueError, TypeError):
            view_count = 0

        rank = search_rank_map.get(vid, len(video_details))

        rows.append({
            "videoId":        vid,
            "title":          snippet.get("title", ""),
            "channelTitle":   snippet.get("channelTitle", ""),
            "durationSeconds": duration_sec,
            "viewCount":      view_count,
            "thumbnailUrl":   thumb_url,
            "url":            f"https://www.youtube.com/watch?v={vid}",
            "_rank":          rank,
            "_log_views":     math.log(view_count + 1),
        })

    if not rows:
        return []

    # Normalise
    max_log  = max(r["_log_views"] for r in rows) or 1
    max_rank = max(r["_rank"]      for r in rows) or 1
    target_sec = target_minutes * 60

    scored = []
    for r in rows:
        norm_views = r["_log_views"] / max_log
        norm_rank  = 1 - (r["_rank"] / (max_rank + 1))  # higher rank = lower number, so invert
        duration_delta = abs(r["durationSeconds"] - target_sec) / (target_sec or 1)
        norm_duration  = max(0.0, 1.0 - min(duration_delta, 1.0))

        score = 0.4 * norm_views + 0.3 * norm_rank + 0.3 * norm_duration
        scored.append({
            "videoId":         r["videoId"],
            "title":           r["title"],
            "channelTitle":    r["channelTitle"],
            "durationSeconds": r["durationSeconds"],
            "viewCount":       r["viewCount"],
            "thumbnailUrl":    r["thumbnailUrl"],
            "url":             r["url"],
            "score":           round(score, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def search_section_candidates(
    section_title: str,
    topic: str,
    target_minutes: int,
    top_n: int = 8,
    max_results: int = 15,
) -> list[dict[str, Any]]:
    """
    Convenience function: search → detail → filter → score → top-N.
    Falls back to a broader query (title only) if the scoped query yields
    too few candidates after filtering.
    """
    query = f"{section_title} {topic} tutorial"
    search_items = search_videos(query, max_results=max_results)

    if len(search_items) < 3:
        # Fallback: drop the topic qualifier
        logger.info("Fallback query for section '%s' (scoped returned %d results)", section_title, len(search_items))
        query = f"{section_title} tutorial"
        search_items = search_videos(query, max_results=max_results)

    # Build a rank map: videoId → 0-based search rank
    rank_map = {
        item["id"]["videoId"]: idx
        for idx, item in enumerate(search_items)
        if isinstance(item.get("id"), dict)
    }
    video_ids = list(rank_map.keys())

    if not video_ids:
        return []

    details  = get_video_details(video_ids)
    filtered = filter_candidates(details)
    scored   = score_candidates(filtered, target_minutes, rank_map)
    return scored[:top_n]


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class QuotaExceededError(Exception):
    """Raised when the YouTube Data API quota is exhausted."""

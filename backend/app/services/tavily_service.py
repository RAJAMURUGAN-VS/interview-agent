"""
Tavily Search API wrapper for multi-source doubt resolution.

Performs three parallel searches per question:
1. General search (docs + blogs)
2. GitHub search
3. YouTube search
"""

import logging
from typing import Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

from ..config import Config

logger = logging.getLogger(__name__)

TAVILY_API_BASE = "https://api.tavily.com"


def search_general(query: str, max_results: int = 8) -> list[dict[str, Any]]:
    """
    General search — mix of official docs and blog articles/tutorials.
    """
    if not Config.TAVILY_API_KEY:
        logger.error("TAVILY_API_KEY not configured")
        return []

    try:
        resp = requests.post(
            f"{TAVILY_API_BASE}/search",
            json={
                "api_key": Config.TAVILY_API_KEY,
                "query": query,
                "topic": "general",
                "max_results": max_results,
                "include_sources": True,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        logger.info(f"General search for '{query}': {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"General search failed: {e}")
        return []


def search_github(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    GitHub-specific search for code examples and implementations.
    """
    if not Config.TAVILY_API_KEY:
        return []

    try:
        resp = requests.post(
            f"{TAVILY_API_BASE}/search",
            json={
                "api_key": Config.TAVILY_API_KEY,
                "query": f"{query} example implementation",
                "topic": "general",
                "max_results": max_results,
                "include_domains": ["github.com"],
                "include_sources": True,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        logger.info(f"GitHub search for '{query}': {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"GitHub search failed: {e}")
        return []


def search_youtube(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    YouTube-specific search for tutorial videos.
    """
    if not Config.TAVILY_API_KEY:
        return []

    try:
        resp = requests.post(
            f"{TAVILY_API_BASE}/search",
            json={
                "api_key": Config.TAVILY_API_KEY,
                "query": f"{query} explained tutorial",
                "topic": "general",
                "max_results": max_results,
                "include_domains": ["youtube.com"],
                "include_sources": True,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        logger.info(f"YouTube search for '{query}': {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"YouTube search failed: {e}")
        return []


def search_parallel(query: str) -> dict[str, list[dict[str, Any]]]:
    """
    Execute all three searches in parallel.
    Returns dict with keys: general, github, youtube
    """
    results = {"general": [], "github": [], "youtube": []}

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(search_general, query): "general",
            executor.submit(search_github, query): "github",
            executor.submit(search_youtube, query): "youtube",
        }

        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception as e:
                logger.error(f"Parallel search for {key} failed: {e}")
                results[key] = []

    return results


# ---------------------------------------------------------------------------
# Prep Plan — company pattern discovery searches (4 angles in parallel)
# ---------------------------------------------------------------------------

def search_company_pattern(company: str) -> list[dict[str, Any]]:
    """
    Run 4 parallel Tavily searches covering different angles of a company's
    interview/placement process. Returns a deduplicated merged list.
    """
    if not Config.TAVILY_API_KEY:
        logger.error("TAVILY_API_KEY not configured")
        return []

    queries = [
        f"{company} placement interview process rounds freshers campus",
        f"{company} coding round topics questions online assessment",
        f"{company} aptitude test pattern logical reasoning",
        f"{company} technical interview questions experience",
    ]

    all_results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    def _run(q: str) -> list[dict[str, Any]]:
        try:
            resp = requests.post(
                f"{TAVILY_API_BASE}/search",
                json={
                    "api_key": Config.TAVILY_API_KEY,
                    "query": q,
                    "topic": "general",
                    "max_results": 6,
                    "include_sources": True,
                },
                timeout=12,
            )
            resp.raise_for_status()
            return resp.json().get("results", [])
        except Exception as e:
            logger.error(f"Company pattern search failed for '{q}': {e}")
            return []

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_run, q): q for q in queries}
        for future in as_completed(futures):
            for item in future.result():
                url = item.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(item)

    logger.info(f"Company pattern search for '{company}': {len(all_results)} unique results")
    return all_results


# ---------------------------------------------------------------------------
# Prep Plan — per-topic resource searches (3 angles in parallel)
# ---------------------------------------------------------------------------

def search_topic_resources(topic: str) -> list[dict[str, Any]]:
    """
    Run 3 parallel Tavily searches to find the best resources for a prep topic.
    Returns a deduplicated merged list.
    """
    if not Config.TAVILY_API_KEY:
        return []

    queries = [
        f"{topic} tutorial explained for beginners programming",
        f"{topic} leetcode geeksforgeeks problems practice",
        f"{topic} youtube tutorial video explained",
    ]

    all_results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    def _run(q: str) -> list[dict[str, Any]]:
        try:
            resp = requests.post(
                f"{TAVILY_API_BASE}/search",
                json={
                    "api_key": Config.TAVILY_API_KEY,
                    "query": q,
                    "topic": "general",
                    "max_results": 5,
                    "include_sources": True,
                },
                timeout=12,
            )
            resp.raise_for_status()
            return resp.json().get("results", [])
        except Exception as e:
            logger.error(f"Topic resource search failed for '{q}': {e}")
            return []

    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(_run, q): q for q in queries}
        for future in as_completed(futures):
            for item in future.result():
                url = item.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(item)

    logger.info(f"Topic resource search for '{topic}': {len(all_results)} unique results")
    return all_results

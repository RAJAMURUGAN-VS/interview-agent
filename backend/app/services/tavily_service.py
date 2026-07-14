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

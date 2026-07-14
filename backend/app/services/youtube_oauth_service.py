"""
YouTube OAuth service — handles direct Google OAuth 2.0 for playlist write operations.

This service implements direct Google OAuth (not via Pipedream proxy) because
Pipedream's REST API does not yet expose a server-side proxy endpoint for Python.

Flow:
  1. Frontend calls GET /playlist/google-auth-url?external_user_id=...
  2. User is redirected to Google consent screen
  3. Google redirects to /playlist/google-callback?code=...&state=...
  4. Backend exchanges code for tokens and stores them in memory
  5. create_playlist / add_playlist_item use stored tokens to call YouTube API

Required env vars (add to backend/.env):
  GOOGLE_OAUTH_CLIENT_ID     — from Google Cloud Console OAuth 2.0 credentials
  GOOGLE_OAUTH_CLIENT_SECRET — from Google Cloud Console OAuth 2.0 credentials
  FRONTEND_URL               — e.g. http://localhost:5173 (for post-auth redirect)

The same Google Cloud project that issued YOUTUBE_DATA_API_KEY can issue these
OAuth credentials: Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
  Application type: Web application
  Authorised redirect URI: http://localhost:5000/playlist/google-callback
"""

import json
import logging
import threading
import time
from typing import Any
from urllib.parse import urlencode

import requests

from ..config import Config

logger = logging.getLogger(__name__)

# ── In-memory token store (keyed by external_user_id) ────────────────────────
# Format: { external_user_id: { access_token, refresh_token, expires_at } }
_token_store: dict[str, dict[str, Any]] = {}
_token_lock = threading.Lock()

GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
YOUTUBE_BASE_URL   = "https://www.googleapis.com/youtube/v3"
YOUTUBE_SCOPES     = " ".join([
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
])


# ── Auth URL generation ───────────────────────────────────────────────────────

def get_google_auth_url(external_user_id: str) -> str:
    """
    Generate the Google OAuth consent URL. The frontend redirects the user here.
    After authorisation, Google redirects to /playlist/google-callback.
    """
    params = {
        "client_id":     Config.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri":  _redirect_uri(),
        "response_type": "code",
        "scope":         YOUTUBE_SCOPES,
        "access_type":   "offline",   # needed to get a refresh_token
        "prompt":        "consent",   # force refresh_token even if user previously authorised
        "state":         external_user_id,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


# ── OAuth callback ────────────────────────────────────────────────────────────

def handle_google_callback(code: str, external_user_id: str) -> dict[str, Any]:
    """
    Exchange an authorisation code for tokens and store them.
    Called by the /playlist/google-callback route.
    """
    resp = requests.post(GOOGLE_TOKEN_URL, data={
        "code":          code,
        "client_id":     Config.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": Config.GOOGLE_OAUTH_CLIENT_SECRET,
        "redirect_uri":  _redirect_uri(),
        "grant_type":    "authorization_code",
    }, timeout=15)

    resp.raise_for_status()
    data = resp.json()

    if "error" in data:
        raise ValueError(f"Google token exchange failed: {data.get('error_description', data['error'])}")

    _store_tokens(external_user_id, data)
    logger.info("Google OAuth tokens stored for user %s", external_user_id)
    return {"connected": True, "external_user_id": external_user_id}


# ── Connection status ─────────────────────────────────────────────────────────

def is_youtube_connected(external_user_id: str) -> bool:
    """Return True if we have a valid (or refreshable) token for this user."""
    try:
        _get_valid_token(external_user_id)
        return True
    except Exception:
        return False


# ── YouTube write operations ──────────────────────────────────────────────────

def create_youtube_playlist(
    external_user_id: str,
    title: str,
    description: str,
    privacy_status: str = "public",
) -> dict[str, Any]:
    """
    Create a YouTube playlist on the connected user's account.

    Returns:
      { "playlist_id": str, "playlist_url": str }
    """
    token = _get_valid_token(external_user_id)
    resp = requests.post(
        f"{YOUTUBE_BASE_URL}/playlists",
        params={"part": "snippet,status"},
        json={
            "snippet": {
                "title":       title,
                "description": description,
                "defaultLanguage": "en",
            },
            "status": {"privacyStatus": privacy_status},
        },
        headers=_auth_headers(token),
        timeout=15,
    )
    _raise_for_youtube_error(resp)
    data = resp.json()
    playlist_id = data["id"]
    logger.info("Created YouTube playlist '%s' (%s) for user %s", title, playlist_id, external_user_id)
    return {
        "playlist_id":  playlist_id,
        "playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}",
    }


def add_video_to_playlist(
    external_user_id: str,
    playlist_id: str,
    video_id: str,
    position: int = 0,
) -> dict[str, Any]:
    """
    Insert a video into a YouTube playlist.

    Returns:
      { "item_id": str }
    """
    token = _get_valid_token(external_user_id)
    resp = requests.post(
        f"{YOUTUBE_BASE_URL}/playlistItems",
        params={"part": "snippet"},
        json={
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {
                    "kind":    "youtube#video",
                    "videoId": video_id,
                },
                "position": position,
            },
        },
        headers=_auth_headers(token),
        timeout=15,
    )
    _raise_for_youtube_error(resp)
    data = resp.json()
    logger.info("Added video %s to playlist %s at position %d", video_id, playlist_id, position)
    return {"item_id": data["id"]}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _redirect_uri() -> str:
    backend_url = getattr(Config, "BACKEND_URL", None) or "http://localhost:5000"
    return f"{backend_url}/playlist/google-callback"


def _auth_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }


def _store_tokens(external_user_id: str, token_data: dict) -> None:
    expires_in = int(token_data.get("expires_in", 3600))
    entry: dict[str, Any] = {
        "access_token":  token_data["access_token"],
        "expires_at":    time.time() + expires_in - 60,  # 60s safety margin
    }
    if "refresh_token" in token_data:
        entry["refresh_token"] = token_data["refresh_token"]

    with _token_lock:
        # Preserve existing refresh_token if the new response doesn't include one
        existing = _token_store.get(external_user_id, {})
        if "refresh_token" not in entry and "refresh_token" in existing:
            entry["refresh_token"] = existing["refresh_token"]
        _token_store[external_user_id] = entry


def _get_valid_token(external_user_id: str) -> str:
    """Return a valid access token, refreshing it if expired."""
    with _token_lock:
        entry = _token_store.get(external_user_id)

    if not entry:
        raise ValueError(
            f"No YouTube account connected for user {external_user_id}. "
            "Please complete the Google OAuth flow first."
        )

    # Token still valid
    if time.time() < entry.get("expires_at", 0):
        return entry["access_token"]

    # Refresh the token
    refresh_token = entry.get("refresh_token")
    if not refresh_token:
        raise ValueError(
            f"Access token expired for user {external_user_id} and no refresh token available. "
            "Please reconnect your YouTube account."
        )

    logger.info("Refreshing YouTube access token for user %s", external_user_id)
    resp = requests.post(GOOGLE_TOKEN_URL, data={
        "refresh_token": refresh_token,
        "client_id":     Config.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": Config.GOOGLE_OAUTH_CLIENT_SECRET,
        "grant_type":    "refresh_token",
    }, timeout=15)

    resp.raise_for_status()
    new_data = resp.json()

    if "error" in new_data:
        raise ValueError(f"Token refresh failed: {new_data.get('error_description', new_data['error'])}")

    _store_tokens(external_user_id, new_data)

    with _token_lock:
        return _token_store[external_user_id]["access_token"]


def _raise_for_youtube_error(resp: requests.Response) -> None:
    """Raise a descriptive ValueError for YouTube API errors."""
    if resp.status_code < 400:
        return
    try:
        error_body = resp.json()
        error_info = error_body.get("error", {})
        msg = error_info.get("message", resp.text)
        code = error_info.get("code", resp.status_code)
        raise ValueError(f"YouTube API error {code}: {msg}")
    except (ValueError, KeyError):
        raise ValueError(f"YouTube API error {resp.status_code}: {resp.text[:300]}")

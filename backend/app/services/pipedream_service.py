"""
Pipedream Connect service — handles OAuth token generation and proxied API calls.

Implements real Pipedream Connect API calls for YouTube OAuth and playlist creation.

To use:
  1. Ensure backend/.env has:
     - PIPEDREAM_CLIENT_ID
     - PIPEDREAM_CLIENT_SECRET
     - PIPEDREAM_PROJECT_ID
  
  2. The YouTube app slug in Pipedream is "google_youtube" by default.
     Check your Pipedream project's app list if you need to change it.

YouTube OAuth scope requested for playlist creation:
  https://www.googleapis.com/auth/youtube

Pipedream Connect REST API docs:
  https://pipedream.com/docs/connect/api/
"""

import logging
from typing import Any
import requests

from ..config import Config


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection status
# ---------------------------------------------------------------------------

def get_connected_account(
    external_user_id: str,
    app: str = "google_youtube",
) -> dict[str, Any]:
    """
    Check whether a user has already connected their YouTube account
    via Pipedream Connect.

    Returns:
      { "connected": bool, "channel_title": str | None }
    """
    # Stub mode when credentials are missing
    credentials_missing = (
        not Config.PIPEDREAM_PROJECT_ID
        or not Config.PIPEDREAM_CLIENT_ID
        or not Config.PIPEDREAM_CLIENT_SECRET
        or "YOUR_PIPEDREAM" in (Config.PIPEDREAM_PROJECT_ID or "")
    )
    if credentials_missing:
        logger.info("[STUB] get_connected_account: credentials not configured")
        return {"connected": False, "channel_title": None}

    try:
        token = _get_project_token()
        resp = requests.get(
            f"https://api.pipedream.com/v1/connect/{Config.PIPEDREAM_PROJECT_ID}/accounts",
            params={"external_user_id": external_user_id, "app": app},
            headers=_env_headers(token),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        accounts = data.get("data", [])
        if accounts:
            name = accounts[0].get("name") or accounts[0].get("external_id") or "YouTube"
            logger.info("User %s has connected account: %s", external_user_id, name)
            return {"connected": True, "channel_title": name}
        return {"connected": False, "channel_title": None}
    except Exception as exc:
        logger.error("get_connected_account error: %s", exc)
        return {"connected": False, "channel_title": None}


# ---------------------------------------------------------------------------
# Connect token (OAuth initiation)
# ---------------------------------------------------------------------------

def create_connect_token(
    external_user_id: str,
    app: str = "youtube_data_api",
    scopes: list[str] | None = None,
) -> dict[str, Any]:
    """
    Mint a short-lived Pipedream Connect URL for the given user.
    The frontend opens this URL in a popup window.

    Returns:
      { "connect_url": str }

    The `scopes` parameter is accepted for API symmetry with the rest of the
    codebase, but is NOT sent to Pipedream — the YouTube app's Google OAuth
    scopes are configured on the app in the Pipedream project, not on the
    connect token. Sending them causes Pipedream to return 400.

    The `app` parameter is appended to the returned `connect_link_url` as a
    query parameter so the hosted Connect UI knows which app to display.
    Without `app=...` in the URL, the page returns:
      "Please include the app in the Connect URL. ..."

    Pipedream Connect API docs:
    https://pipedream.com/docs/connect/api/#create-a-connect-token
    """
    if scopes is None:
        scopes = ["https://www.googleapis.com/auth/youtube"]

    # ── Stub mode: credentials not yet configured ─────────────────────────
    credentials_missing = (
        not Config.PIPEDREAM_PROJECT_ID
        or not Config.PIPEDREAM_CLIENT_ID
        or not Config.PIPEDREAM_CLIENT_SECRET
        or "YOUR_PIPEDREAM" in (Config.PIPEDREAM_PROJECT_ID or "")
        or "YOUR_PIPEDREAM" in (Config.PIPEDREAM_CLIENT_ID or "")
    )
    if credentials_missing:
        logger.info(
            "[STUB] create_connect_token: Pipedream credentials not configured. "
            "Returning placeholder connect URL."
        )
        return {
            "connect_url": (
                "https://pipedream.com/connect/TODO_REPLACE"
                "?note=Add+Pipedream+credentials+to+backend/.env"
            )
        }

    # ── Real Pipedream Connect token creation ─────────────────────────────
    # NOTE: The /v1/connect/{project_id}/tokens endpoint accepts only a
    # very small body — currently just `external_user_id` plus optional
    # `allowed_origins`, `error_redirect_uri`, `success_redirect_uri`,
    # `webhook_uri`, `expires_in`, and a Pipedream `scope` (e.g.
    # `connect:accounts:read`). It does NOT accept:
    #   - `app`  → the app is appended to the returned `connect_link_url`
    #              as a query parameter so the hosted Connect UI knows
    #              which app to display.
    #   - Google OAuth scopes (`https://www.googleapis.com/auth/youtube`)
    #              → the YouTube app's Google OAuth scopes are configured
    #              on the app in the Pipedream project, not on the token.
    #              Sending either of these makes Pipedream return 400.
    # Without `app=...` in the URL, the hosted page returns:
    #   "Please include the app in the Connect URL. Please retry or contact support."
    # See: https://pipedream.com/docs/connect/api-reference/create-connect-token
    url = f"https://api.pipedream.com/v1/connect/{Config.PIPEDREAM_PROJECT_ID}/tokens"
    payload: dict[str, Any] = {
        "external_user_id": external_user_id,
    }

    try:
        token = _get_project_token()
        resp = requests.post(url, json=payload, headers=_env_headers(token), timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # Pipedream returns "connect_link_url" (not "connect_url")
        connect_url = data.get("connect_link_url") or data.get("connect_url")
        if not connect_url:
            raise ValueError(f"No connect_link_url in Pipedream response: {data}")

        # Append the app slug so the hosted Connect UI knows which app to show.
        # We use a manual join to avoid Python's urllib adding it twice if the
        # URL already contains a fragment, and to preserve any existing query.
        separator = "&" if "?" in connect_url else "?"
        connect_url = f"{connect_url}{separator}app={app}"

        logger.info(
            "Created connect token for user %s, app %s",
            external_user_id, app,
        )
        return {"connect_url": connect_url}

    except requests.exceptions.RequestException as e:
        # Try to extract Pipedream's error message from the response body so
        # debugging is easier (the default `str(e)` only shows the URL/status).
        body = ""
        if e.response is not None:
            try:
                body = e.response.text
            except Exception:
                pass
        logger.exception("Failed to create Pipedream connect token")
        detail = f"{e} | response: {body}" if body else str(e)
        raise ValueError(f"Failed to create connect token: {detail}") from e



# ---------------------------------------------------------------------------
# YouTube write operations (proxied through Pipedream using user's OAuth token)
# ---------------------------------------------------------------------------

def create_playlist(
    external_user_id: str,
    title: str,
    description: str,
    privacy_status: str = "public",
) -> dict[str, Any]:
    """
    Create a YouTube playlist on the connected user's account via Pipedream's
    authenticated proxy.

    Returns:
      { "playlist_id": str, "playlist_url": str }

    # TODO: Replace this stub with a real Pipedream proxied API call.
    #
    # Real implementation (pseudo-code):
    #   url = f"https://api.pipedream.com/v1/connect/{Config.PIPEDREAM_PROJECT_ID}/proxy"
    #   payload = {
    #       "external_user_id": external_user_id,
    #       "app": "google_youtube",
    #       "method": "POST",
    #       "url": "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status",
    #       "body": {
    #           "snippet": {"title": title, "description": description},
    #           "status": {"privacyStatus": privacy_status},
    #       },
    #   }
    #   resp = requests.post(url, json=payload, headers=_project_headers())
    #   data = resp.json()
    #   playlist_id = data["id"]
    #   return {
    #       "playlist_id": playlist_id,
    #       "playlist_url": f"https://www.youtube.com/playlist?list={playlist_id}",
    #   }
    """
    logger.info(
        "[STUB] create_playlist: external_user_id=%s title='%s' privacy=%s",
        external_user_id, title, privacy_status,
    )
    stub_id = "PLstub_TODO_REPLACE_WITH_REAL_PLAYLIST_ID"
    return {
        "playlist_id": stub_id,
        "playlist_url": f"https://www.youtube.com/playlist?list={stub_id}",
    }


def add_playlist_item(
    external_user_id: str,
    playlist_id: str,
    video_id: str,
    position: int,
) -> dict[str, Any]:
    """
    Insert a video into a YouTube playlist at a given position, using the
    connected user's OAuth token via Pipedream's authenticated proxy.

    Returns:
      { "item_id": str }

    # TODO: Replace this stub with a real Pipedream proxied API call.
    #
    # Real implementation (pseudo-code):
    #   url = f"https://api.pipedream.com/v1/connect/{Config.PIPEDREAM_PROJECT_ID}/proxy"
    #   payload = {
    #       "external_user_id": external_user_id,
    #       "app": "google_youtube",
    #       "method": "POST",
    #       "url": "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
    #       "body": {
    #           "snippet": {
    #               "playlistId": playlist_id,
    #               "resourceId": {"kind": "youtube#video", "videoId": video_id},
    #               "position": position,
    #           }
    #       },
    #   }
    #   resp = requests.post(url, json=payload, headers=_project_headers())
    #   data = resp.json()
    #   return {"item_id": data["id"]}
    """
    logger.info(
        "[STUB] add_playlist_item: playlist_id=%s video_id=%s position=%d",
        playlist_id, video_id, position,
    )
    return {"item_id": f"PLitem_stub_{video_id}_{position}"}


# ---------------------------------------------------------------------------
# Internal helpers (to be implemented when credentials are available)
# ---------------------------------------------------------------------------

def _get_project_token() -> str:
    """
    Exchange PIPEDREAM_CLIENT_ID + PIPEDREAM_CLIENT_SECRET for a
    short-lived project-level bearer token using the Pipedream OAuth2 flow.
    See: https://pipedream.com/docs/connect/api/#authentication
    """
    if not Config.PIPEDREAM_CLIENT_ID or not Config.PIPEDREAM_CLIENT_SECRET:
        raise ValueError(
            "Pipedream credentials not configured. "
            "Add PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET to backend/.env."
        )

    url = "https://api.pipedream.com/v1/oauth/token"
    payload = {
        "client_id": Config.PIPEDREAM_CLIENT_ID,
        "client_secret": Config.PIPEDREAM_CLIENT_SECRET,
        "grant_type": "client_credentials",
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        raise ValueError("Timeout connecting to Pipedream API")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to connect to Pipedream: {str(e)}")

    data = resp.json()

    if "error" in data:
        raise ValueError(f"Pipedream auth failed: {data.get('error_description', data['error'])}")

    token = data.get("access_token")
    if not token:
        raise ValueError("No access token in Pipedream response")

    logger.info("Successfully obtained Pipedream project token")
    return token


def _env_headers(token: str) -> dict[str, str]:
    """Auth + environment headers required by all Pipedream Connect endpoints."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-PD-Environment": Config.PIPEDREAM_ENVIRONMENT or "development",
    }


def _project_headers() -> dict[str, str]:
    """Return auth headers for Pipedream project-level requests (no env header)."""
    return {
        "Authorization": f"Bearer {_get_project_token()}",
        "Content-Type": "application/json",
    }

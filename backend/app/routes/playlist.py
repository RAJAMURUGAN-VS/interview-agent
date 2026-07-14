"""
Playlist blueprint — /playlist/* endpoints.

Endpoints:
  POST /playlist/roadmap              Generate roadmap via LLM
  GET  /playlist/connection-status    Check YouTube account connection
  POST /playlist/connect-token        Mint a Pipedream Connect URL (for discovery)
  GET  /playlist/google-auth-url      Get Google OAuth URL for YouTube write access
  GET  /playlist/google-callback      Handle Google OAuth redirect callback
  POST /playlist/generate             Start background generation job
  GET  /playlist/status/<job_id>      Poll job progress
"""

import logging

from flask import Blueprint, jsonify, redirect, request

from ..services import pipedream_service as pd_svc
from ..services import playlist_service
from ..services import youtube_oauth_service as yt_oauth
from ..config import Config

logger = logging.getLogger(__name__)

bp = Blueprint("playlist", __name__, url_prefix="/playlist")


# ---------------------------------------------------------------------------
# POST /playlist/roadmap
# ---------------------------------------------------------------------------

@bp.route("/roadmap", methods=["POST"])
def generate_roadmap_endpoint():
    """Generate a structured learning roadmap."""
    data           = request.json or {}
    topic          = str(data.get("topic", "")).strip()
    duration_hours = data.get("duration_hours", 0)

    if not topic:
        return jsonify({"success": False, "error": "topic is required"}), 400
    try:
        duration_hours = float(duration_hours)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "duration_hours must be a number"}), 400
    if not (0.5 <= duration_hours <= 100):
        return jsonify({"success": False, "error": "duration_hours must be between 0.5 and 100"}), 400

    try:
        roadmap = playlist_service.generate_roadmap(topic, duration_hours)
        return jsonify({"success": True, "roadmap": roadmap})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 422
    except Exception as exc:
        logger.exception("Roadmap generation failed")
        return jsonify({"success": False, "error": f"Failed to generate roadmap: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# GET /playlist/connection-status
# ---------------------------------------------------------------------------

@bp.route("/connection-status", methods=["GET"])
def connection_status_endpoint():
    """
    Check whether a user has a valid Google OAuth token stored server-side.
    Only returns connected:true when we actually have a token that can
    make YouTube write calls. A Pipedream-only connection is NOT sufficient.
    """
    external_user_id = request.args.get("external_user_id", "").strip()
    if not external_user_id:
        return jsonify({"success": False, "error": "external_user_id is required"}), 400

    connected = yt_oauth.is_youtube_connected(external_user_id)
    return jsonify({"connected": connected, "method": "google_oauth" if connected else None})

# ---------------------------------------------------------------------------
# POST /playlist/connect-token  (Pipedream — kept for UI discovery)
# ---------------------------------------------------------------------------

@bp.route("/connect-token", methods=["POST"])
def connect_token_endpoint():
    """Mint a short-lived Pipedream Connect URL for app discovery."""
    data             = request.json or {}
    external_user_id = str(data.get("external_user_id", "")).strip()
    if not external_user_id:
        return jsonify({"success": False, "error": "external_user_id is required"}), 400

    try:
        result = pd_svc.create_connect_token(external_user_id)
        return jsonify(result)
    except Exception as exc:
        logger.exception("Connect token creation failed")
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /playlist/google-auth-url   ← NEW: direct Google OAuth
# ---------------------------------------------------------------------------

@bp.route("/google-auth-url", methods=["GET"])
def google_auth_url_endpoint():
    """
    Return a Google OAuth URL the frontend can open in a popup.

    Query params:
      external_user_id: str

    Response:
      { "auth_url": str }
    """
    external_user_id = request.args.get("external_user_id", "").strip()
    if not external_user_id:
        return jsonify({"success": False, "error": "external_user_id is required"}), 400

    if not Config.GOOGLE_OAUTH_CLIENT_ID or "YOUR_GOOGLE" in (Config.GOOGLE_OAUTH_CLIENT_ID or ""):
        return jsonify({
            "success": False,
            "error": (
                "GOOGLE_OAUTH_CLIENT_ID not configured. "
                "Add it to backend/.env — see the comment in that file for instructions."
            ),
        }), 503

    try:
        auth_url = yt_oauth.get_google_auth_url(external_user_id)
        return jsonify({"success": True, "auth_url": auth_url})
    except Exception as exc:
        logger.exception("Google auth URL generation failed")
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /playlist/google-callback   ← NEW: Google OAuth redirect callback
# ---------------------------------------------------------------------------

@bp.route("/google-callback", methods=["GET"])
def google_callback_endpoint():
    """
    Handle the Google OAuth redirect callback.
    Exchanges the code for tokens, stores them, and redirects the popup to a
    success page that closes itself.
    """
    code             = request.args.get("code", "").strip()
    state            = request.args.get("state", "").strip()   # external_user_id
    error            = request.args.get("error", "").strip()

    frontend_url = Config.FRONTEND_URL if hasattr(Config, "FRONTEND_URL") else "http://localhost:5173"

    if error:
        logger.warning("Google OAuth error: %s", error)
        return redirect(f"{frontend_url}/playlist?yt_connected=error&reason={error}")

    if not code or not state:
        return jsonify({"success": False, "error": "Missing code or state"}), 400

    try:
        yt_oauth.handle_google_callback(code, state)
        # Redirect to a page that closes the popup and notifies the opener
        return redirect(f"{frontend_url}/playlist?yt_connected=true")
    except Exception as exc:
        logger.exception("Google OAuth callback failed")
        return redirect(f"{frontend_url}/playlist?yt_connected=error&reason=token_exchange_failed")


# ---------------------------------------------------------------------------
# POST /playlist/generate
# ---------------------------------------------------------------------------

@bp.route("/generate", methods=["POST"])
def start_generation_endpoint():
    """Start a background playlist generation job."""
    data             = request.json or {}
    external_user_id = str(data.get("external_user_id", "")).strip()
    topic            = str(data.get("topic", "")).strip()
    roadmap          = data.get("roadmap", [])
    privacy          = data.get("privacy", "public")

    try:
        duration_hours = float(data.get("duration_hours", 0))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "duration_hours must be a number"}), 400

    if not external_user_id:
        return jsonify({"success": False, "error": "external_user_id is required"}), 400
    if not topic:
        return jsonify({"success": False, "error": "topic is required"}), 400
    if not roadmap or not isinstance(roadmap, list):
        return jsonify({"success": False, "error": "roadmap must be a non-empty array"}), 400
    if privacy not in ("public", "unlisted", "private"):
        privacy = "public"

    # Require a direct Google OAuth token — Pipedream connection alone is not
    # enough because we call YouTube APIs server-side using our stored token.
    if not yt_oauth.is_youtube_connected(external_user_id):
        return jsonify({
            "success": False,
            "error": (
                "YouTube account not connected for this session. "
                "Please click 'Connect YouTube Account' to authorise with Google."
            ),
            "needs_connection": True,
        }), 403

    try:
        job_id = playlist_service.start_generation_job(
            external_user_id=external_user_id,
            topic=topic,
            duration_hours=duration_hours,
            roadmap=roadmap,
            privacy=privacy,
        )
        return jsonify({"success": True, "job_id": job_id})
    except Exception as exc:
        logger.exception("Failed to start generation job")
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /playlist/status/<job_id>
# ---------------------------------------------------------------------------

@bp.route("/status/<job_id>", methods=["GET"])
def job_status_endpoint(job_id: str):
    """Poll a playlist generation job's current state."""
    job = playlist_service.get_job(job_id)
    if not job:
        return jsonify({"success": False, "error": "Job not found"}), 404

    return jsonify({
        "phase":                   job.phase,
        "roadmap":                 job.roadmap or None,
        "selected_videos":         job.selected_videos or None,
        "target_duration_minutes": job.target_duration_minutes,
        "actual_duration_minutes": job.actual_duration_minutes,
        "playlist_url":            job.playlist_url,
        "error_message":           job.error_message,
    })

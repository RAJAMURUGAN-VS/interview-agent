"""
Auth routes blueprint.

POST /auth/google   — verify Google ID token → upsert user → return session JWT
GET  /auth/me       — return current user info (requires valid session JWT)
POST /auth/logout   — stateless logout (client discards token; server returns success)
"""

from datetime import datetime

from flask import Blueprint, g, jsonify, request

from .. import db
from ..models.user import User
from ..services.auth_service import issue_session_token, verify_google_token
from ..utils.auth_decorators import login_required

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# POST /auth/google
# ---------------------------------------------------------------------------

@auth_bp.route("/auth/google", methods=["POST"])
def google_sign_in():
    """Exchange a Google ID token for the app's session JWT.

    Body (JSON): { "credential": "<Google ID token string>" }

    Response (200): {
        "success": true,
        "token": "<session JWT>",
        "is_new_user": <bool>,
        "user": { "name", "email", "picture" }
    }
    """
    data = request.get_json(silent=True) or {}
    credential = data.get("credential", "").strip()

    if not credential:
        return jsonify({"success": False, "error": "Missing 'credential' in request body."}), 400

    try:
        claims = verify_google_token(credential)
    except ValueError as exc:
        return jsonify({"success": False, "error": f"Google token verification failed: {exc}"}), 401

    # Upsert the user row by stable google_sub.
    user = User.query.filter_by(google_sub=claims["google_sub"]).first()
    is_new_user = user is None

    if is_new_user:
        user = User(
            google_sub          = claims["google_sub"],
            email               = claims["email"],
            name                = claims["name"],
            profile_picture_url = claims["picture"],
        )
        db.session.add(user)
    else:
        user.last_login_at = datetime.utcnow()
        # Keep name / picture fresh in case user updated them on Google.
        user.name                = claims["name"]
        user.profile_picture_url = claims["picture"]

    db.session.commit()

    token = issue_session_token(user)

    return jsonify({
        "success":     True,
        "token":       token,
        "is_new_user": is_new_user,
        "user":        user.to_dict(),
    })


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@auth_bp.route("/auth/me", methods=["GET"])
@login_required
def get_current_user():
    """Return the currently authenticated user's profile.

    Requires: Authorization: Bearer <session JWT>
    """
    return jsonify({"success": True, "user": g.current_user.to_dict()})


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    """Stateless logout.

    The session JWT is short-lived (7 days) and there's no server-side
    revocation list. Logout is primarily a client-side token discard.
    This endpoint exists so the frontend has a clean API call to make
    and we can add server-side token blocklisting later if needed.
    """
    return jsonify({"success": True})

"""
Flask request decorators for authentication.

@login_required
  Reads 'Authorization: Bearer <token>' from the request headers,
  verifies the app's JWT, looks up the user row, and stores it on
  Flask's request-scoped 'g' object as g.current_user.

  Returns 401 JSON on any auth failure so every protected route
  gets consistent error responses without extra boilerplate.

Usage:
    from app.utils.auth_decorators import login_required

    @bp.route("/some/protected/route")
    @login_required
    def my_view():
        user = g.current_user  # always a valid User instance here
        ...
"""

from functools import wraps

import jwt
from flask import g, jsonify, request

from ..models.user import User
from ..services.auth_service import decode_session_token


def login_required(f):
    """Decorator: require a valid session JWT in the Authorization header."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Not authenticated"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = decode_session_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "error": "Session expired. Please sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "error": "Invalid session token."}), 401

        user = User.query.get(payload.get("user_id"))
        if user is None:
            return jsonify({"success": False, "error": "User not found."}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return wrapper

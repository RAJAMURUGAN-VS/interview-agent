"""
Auth service: Google ID-token verification and session JWT management.

verify_google_token()  — validates the Google credential against Google's
                         public keys and returns the extracted claims.
issue_session_token()  — signs the app's own 7-day JWT for the given user.
decode_session_token() — verifies and decodes the app's JWT.
"""

from datetime import datetime, timedelta

import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from ..config import Config


def verify_google_token(credential: str) -> dict:
    """Verify a Google ID token and return its normalised claims.

    Args:
        credential: The raw credential string from Google Identity Services.

    Returns:
        dict with keys: google_sub, email, name, picture.

    Raises:
        ValueError: if the token is invalid, expired, or has the wrong audience.
    """
    idinfo = id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        Config.GOOGLE_CLIENT_ID,
    )

    return {
        "google_sub": idinfo["sub"],
        "email":      idinfo["email"],
        # Fall back to email prefix if no display name (rare but possible).
        "name":       idinfo.get("name") or idinfo["email"].split("@")[0],
        "picture":    idinfo.get("picture"),
    }


def issue_session_token(user) -> str:
    """Sign and return a 7-day JWT for the given User row.

    Payload: { user_id, email, exp }
    Algorithm: HS256 using Config.JWT_SECRET_KEY.
    """
    payload = {
        "user_id": user.id,
        "email":   user.email,
        "exp":     datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_session_token(token: str) -> dict:
    """Decode and verify the app's session JWT.

    Returns:
        The decoded payload dict.

    Raises:
        jwt.ExpiredSignatureError: if the token has expired.
        jwt.InvalidTokenError: for any other JWT problem.
    """
    return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])

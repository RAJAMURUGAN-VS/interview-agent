import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
    MURF_API_KEY = os.getenv("MURF_API_KEY")
    ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
    FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")

    # ── Playlist / YouTube / Pipedream ────────────────────────────────────
    YOUTUBE_DATA_API_KEY       = os.getenv("YOUTUBE_DATA_API_KEY")
    PIPEDREAM_CLIENT_ID        = os.getenv("PIPEDREAM_CLIENT_ID")
    PIPEDREAM_CLIENT_SECRET    = os.getenv("PIPEDREAM_CLIENT_SECRET")
    PIPEDREAM_PROJECT_ID       = os.getenv("PIPEDREAM_PROJECT_ID")
    PIPEDREAM_ENVIRONMENT      = os.getenv("PIPEDREAM_ENVIRONMENT", "development")

    # Google OAuth 2.0 — for direct YouTube playlist write operations
    # Get from: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
    # Add redirect URI: http://localhost:5000/playlist/google-callback
    GOOGLE_OAUTH_CLIENT_ID     = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    # Backend base URL (used to build OAuth redirect URIs)
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

    # ── Doubt Solver / Tavily Search ──────────────────────────────────────
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

    # ── Auth — Google Identity Services + session JWT ─────────────────────
    # Reuses the same Google OAuth Client ID already in .env.
    # Verify audience claim on incoming Google ID tokens.
    GOOGLE_CLIENT_ID  = os.getenv("GOOGLE_CLIENT_ID")
    # Random secret for signing the app's own session JWTs.
    JWT_SECRET_KEY    = os.getenv("JWT_SECRET_KEY", "change-me-in-production")

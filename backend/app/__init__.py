import os
import sys
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from .config import Config

# ---------------------------------------------------------------------------
# Single shared db instance — imported by models and services
# ---------------------------------------------------------------------------
db = SQLAlchemy()


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # ── Required API keys check ──────────────────────────────────────────
    required = ['PERPLEXITY_API_KEY', 'MURF_API_KEY', 'ASSEMBLYAI_API_KEY']
    missing = [k for k in required if not app.config.get(k)]
    if missing:
        print(f"ERROR: Missing required env vars: {', '.join(missing)}")
        sys.exit(1)

    # ── SQLite database (insights feature) ──────────────────────────────
    # Stored at backend/instance/insights.db  (instance/ is Flask's default
    # instance folder; created automatically if it doesn't exist)
    os.makedirs(app.instance_path, exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"sqlite:///{os.path.join(app.instance_path, 'insights.db')}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS(app, expose_headers=[
        'X-Question-Number', 'X-Interview-Complete',
        'X-Answer-Text', 'X-Transcript',
    ])

    # ── Register blueprints ──────────────────────────────────────────────
    from .routes import interview, feedback, pdf_chat, mcq, codefill
    from .routes import insights as insights_routes
    from .routes import playlist as playlist_routes
    from .routes import doubt_solver as doubt_solver_routes
    from .routes import prep_plan as prep_plan_routes
    from .routes import auth as auth_routes

    app.register_blueprint(interview.bp)
    app.register_blueprint(feedback.bp)
    app.register_blueprint(pdf_chat.bp)
    app.register_blueprint(mcq.bp)
    app.register_blueprint(codefill.bp)
    app.register_blueprint(insights_routes.bp)
    app.register_blueprint(playlist_routes.bp)
    app.register_blueprint(doubt_solver_routes.bp)
    app.register_blueprint(prep_plan_routes.bp)
    app.register_blueprint(auth_routes.auth_bp)

    # ── Create tables + seed on first run ───────────────────────────────
    with app.app_context():
        # Import models so SQLAlchemy is aware of them before create_all()
        from .models.insights_models import (  # noqa: F401
            InterviewExperience,
            PreparationStrategy,
            seed_db,
        )
        from .models.prep_plan_models import (  # noqa: F401
            CompanyPattern,
            TopicResourceCache,
        )
        from .models.user import User  # noqa: F401 — creates 'users' table
        db.create_all()
        seed_db()

    return app

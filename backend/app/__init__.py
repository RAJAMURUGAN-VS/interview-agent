import sys
from flask import Flask
from flask_cors import CORS
from .config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    required = ['GOOGLE_API_KEY', 'MURF_API_KEY', 'ASSEMBLYAI_API_KEY']
    missing = [k for k in required if not app.config.get(k)]
    if missing:
        print(f"ERROR: Missing required env vars: {', '.join(missing)}")
        sys.exit(1)

    CORS(app, expose_headers=['X-Question-Number', 'X-Interview-Complete'])
    from .routes import interview, feedback
    app.register_blueprint(interview.bp)
    app.register_blueprint(feedback.bp)
    return app

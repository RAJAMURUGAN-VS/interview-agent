from flask import Flask
from flask_cors import CORS
from .config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, expose_headers=['X-Question-Number', 'X-Interview-Complete'])
    from .routes import interview, feedback
    app.register_blueprint(interview.bp)
    app.register_blueprint(feedback.bp)
    return app

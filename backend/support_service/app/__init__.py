from flask import Flask
from flask_cors import CORS
from .extensions import db, limiter
from .config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend origins (allow all localhost ports for development)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    limiter.init_app(app)

    # Register blueprints
    from .routes import tickets_bp, support_bp
    app.register_blueprint(tickets_bp, url_prefix="/tickets")
    app.register_blueprint(support_bp, url_prefix="/support")

    with app.app_context():
        db.create_all()

    return app

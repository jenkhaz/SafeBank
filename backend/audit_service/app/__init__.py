from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, limiter


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for all routes
    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    limiter.init_app(app)

    # Register blueprints
    from .routes import audit_bp, security_bp
    app.register_blueprint(audit_bp, url_prefix="/audit")
    app.register_blueprint(security_bp, url_prefix="/security")

    return app

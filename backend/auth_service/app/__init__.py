from flask import Flask, request
import requests
import logging
from flask_cors import CORS
from .config import Config
from .extensions import db, limiter
from .routes import auth_bp

logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend origins (allow all localhost ports for development)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    limiter.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    # Global error handler for rate limit violations
    @app.errorhandler(429)
    def handle_rate_limit(e):
        """Log rate limit violations as security events"""
        endpoint = request.endpoint or "unknown"
        
        # Determine severity based on endpoint
        if "login" in endpoint:
            severity = "high"
            description = "Rate limit exceeded on login endpoint - possible brute force attack"
        elif "register" in endpoint:
            severity = "medium"
            description = "Rate limit exceeded on registration endpoint - possible spam/abuse"
        else:
            severity = "medium"
            description = f"Rate limit exceeded on {endpoint}"
        
        # Log to audit service
        try:
            requests.post("http://audit:5005/security/event", json={
                "event_type": "rate_limit_exceeded",
                "severity": severity,
                "description": description,
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "details": f'{{"endpoint": "{endpoint}", "limit": "{e.description}"}}'
            }, timeout=2)
        except Exception as ex:
            logger.warning(f"Failed to log rate limit violation to audit service: {ex}")
        
        return {"msg": "Rate limit exceeded", "error": str(e.description)}, 429

    return app


# For `flask run` (FLASK_APP=app)
def __getattr__(name):
    if name == "app":
        return create_app()
    raise AttributeError

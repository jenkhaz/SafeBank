from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, limiter
from .routes import accounts_bp, transactions_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend origins (allow all localhost ports for development)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    limiter.init_app(app)

    app.register_blueprint(accounts_bp, url_prefix="/accounts")
    app.register_blueprint(transactions_bp, url_prefix="/transactions")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


def __getattr__(name):
    if name == "app":
        return create_app()
    raise AttributeError

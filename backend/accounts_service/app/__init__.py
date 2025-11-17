from flask import Flask
from .config import Config
from .extensions import db
from .routes import accounts_bp, transactions_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

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

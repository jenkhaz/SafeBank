from flask import Flask
from .config import Config
from .extensions import db
from .routes import auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    # Ensure tables exist on startup (useful for fresh volumes/containers)
    with app.app_context():
        from . import models  # register model metadata

        db.create_all()

    # register blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    return app


# For `flask run` (FLASK_APP=app)
def __getattr__(name):
    if name == "app":
        return create_app()
    raise AttributeError

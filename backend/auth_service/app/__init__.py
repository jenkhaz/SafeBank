from flask import Flask
from .config import Config
from .extensions import db
from .routes import auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

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

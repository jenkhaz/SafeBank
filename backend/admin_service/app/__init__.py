from flask import Flask
from .config import Config
from .routes import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    app.register_blueprint(admin_bp, url_prefix="/admin")

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    return app


# For `flask run` (FLASK_APP=app)
def __getattr__(name):
    if name == "app":
        return create_app()
    raise AttributeError

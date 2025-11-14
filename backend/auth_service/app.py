from flask import Flask

# SUBJECT TO CHANGE FROM REND's CODE
from backend.common.config import Config
from backend.common.db import init_db
from backend.common.security import create_default_roles
from backend.auth_service.routes import auth_bp

def create_auth_app():
    app = Flask(
        __name__,
        template_folder="../../frontend/templates",
        static_folder="../../frontend/static",
    )
    app.config.from_object(Config)

    init_db(app)
    with app.app_context():
        create_default_roles()

    app.register_blueprint(auth_bp, url_prefix="/auth")
    return app


if __name__ == "__main__":
    app = create_auth_app()
    app.run(port=5001, debug=True)

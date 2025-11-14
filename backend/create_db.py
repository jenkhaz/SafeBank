# backend/create_db.py
from flask import Flask
from backend.common.config import Config
from backend.common.db import db, init_db
import backend.common.models  # noqa: F401  # make sure models are imported so tables are registered


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)
    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Database and tables created successfully.")

# backend/create_db.py
from flask import Flask
from common.db import db, init_db  # note: relative to backend/
import common.models  # noqa: F401  # make sure models are imported so tables are registered


def create_app():
    app = Flask(__name__)
    # you can override DB path here if you want:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///../banking.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    init_db(app)
    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Database and tables created successfully.")

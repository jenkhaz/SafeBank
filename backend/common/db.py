# backend/common/db.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    """
    Attach SQLAlchemy to the Flask app.
    You can override SQLALCHEMY_DATABASE_URI in the app config if you want.
    """
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", "sqlite:///banking.db")
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)

    db.init_app(app)

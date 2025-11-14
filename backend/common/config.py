# backend/common/config.py
# In summary: this file centralizes app configuration, 
# making it easy to manage environment-specific settings for 
# Flask and SQLAlchemy.

import os

class Config:
    # Flask secret key (for sessions, CSRF, etc.)
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # Database URL – Dev A can later change this to Postgres/MySQL if needed
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///safebank.db"   # SQLite file in the project root
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

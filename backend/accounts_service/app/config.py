import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev")
    JWT_PUBLIC_KEY = os.environ.get("JWT_PUBLIC_KEY")  # future RS256
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///accounts.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

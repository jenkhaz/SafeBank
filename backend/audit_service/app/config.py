import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:////data/audit.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT verification
    JWT_PUBLIC_KEY_PATH = os.environ.get("JWT_PUBLIC_KEY_PATH", "/app/keys/jwt_public_key.pem")

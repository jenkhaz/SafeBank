import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@support_db:5432/support_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Service URLs for inter-service communication
    AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth:5001")
    ACCOUNTS_SERVICE_URL = os.environ.get("ACCOUNTS_SERVICE_URL", "http://accounts:5002")

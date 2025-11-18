import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    
    # Auth service URL for proxying requests
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:5000")

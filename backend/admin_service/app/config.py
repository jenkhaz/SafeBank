import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")

    # Auth service URL for proxying requests
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:5000")
    
    # Audit service URL
    AUDIT_SERVICE_URL = os.getenv("AUDIT_SERVICE_URL", "http://audit:5005")

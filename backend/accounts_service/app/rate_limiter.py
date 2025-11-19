"""
Rate limiting configuration for Accounts Service
Protects against transaction spam, account enumeration, and API abuse
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def get_limiter(app):
    """
    Initialize Flask-Limiter with configuration
    
    Storage backend: In-memory (for dev) or Redis (for production)
    Key function: IP address based rate limiting
    """
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["500 per day", "100 per hour"],  # Default for all endpoints
        storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
        storage_options={"socket_connect_timeout": 30},
        strategy="fixed-window",
        headers_enabled=True,  # Return rate limit info in response headers
    )
    
    return limiter

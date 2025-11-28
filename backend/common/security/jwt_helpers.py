import jwt
from flask import request, jsonify, g, current_app
import os
import json


def sanitize_log_data(data):
    """
    Sanitize data for logging to prevent log injection attacks.
    Converts any data structure to a safe JSON string.
    """
    if isinstance(data, str):
        # Already a string, just ensure it's JSON-safe
        return json.dumps(data)
    elif isinstance(data, dict):
        # Convert dict to JSON string
        return json.dumps(data)
    else:
        # Convert any other type to JSON string
        return json.dumps(str(data))


def load_public_key():
    """Load public key for JWT verification."""
    public_key_path = os.getenv("JWT_PUBLIC_KEY_PATH", "/app/keys/jwt_public_key.pem")
    try:
        with open(public_key_path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        raise RuntimeError(f"JWT public key not found at {public_key_path}")


def load_private_key():
    """Load private key for JWT signing (Auth Service only)."""
    private_key_path = os.getenv("JWT_PRIVATE_KEY_PATH", "/app/keys/jwt_private_key.pem")
    try:
        with open(private_key_path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        raise RuntimeError(f"JWT private key not found at {private_key_path}")


def decode_jwt():
    """Decode and verify JWT token using RS256."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[len("Bearer "):]

    try:
        public_key = load_public_key()
        # print(f"[JWT DEBUG] Public key loaded, length: {len(public_key)}")
        # print(f"[JWT DEBUG] Token preview: {token[:50]}...")
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],  # Changed from HS256
            audience="safe_bank",
            issuer="auth_service",
        )
        # print(f"[JWT DEBUG] Token decoded successfully: user_id={payload.get('user_id')}")
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"JWT token has expired: {e}")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid JWT token: {type(e).__name__}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error decoding JWT: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_jwt(payload: dict) -> str:
    """
    Create and sign a JWT token using RS256.
    This should ONLY be called by Auth Service.
    """
    try:
        private_key = load_private_key()
        token = jwt.encode(
            payload,
            private_key,
            algorithm="RS256"  # Changed from HS256
        )
        return token
    except Exception as e:
        raise RuntimeError(f"Failed to create JWT: {str(e)}")


def require_jwt(fn):
    def wrapper(*args, **kwargs):
        payload = decode_jwt()
        if not payload:
            return jsonify({"msg": "Invalid or missing JWT"}), 401
        g.user = payload
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

import jwt
from flask import request, jsonify, g, current_app
import os


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
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],  # Changed from HS256
            audience="safe_bank",
            issuer="auth_service",
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
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

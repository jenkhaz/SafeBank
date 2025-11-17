import jwt
from flask import request, jsonify, g, current_app


def decode_jwt():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[len("Bearer "):]

    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET_KEY"],  # HS256 for now
            algorithms=["HS256"],
            audience="safe_bank",
            issuer="auth_service",
        )
        return payload
    except Exception:
        return None


def require_jwt(fn):
    def wrapper(*args, **kwargs):
        payload = decode_jwt()
        if not payload:
            return jsonify({"msg": "Invalid or missing JWT"}), 401
        g.user = payload
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

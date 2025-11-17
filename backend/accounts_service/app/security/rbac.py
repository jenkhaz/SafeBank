from functools import wraps
from flask import g, jsonify
from common.security.jwt_helpers import decode_jwt


def require_permission(*required):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = decode_jwt()
            if not payload:
                return jsonify({"msg": "Unauthorized"}), 401
            
            user_permissions = set(payload.get("permissions", []))
            if not user_permissions.intersection(required) and not "admin" in payload.get("roles", []):
                return jsonify({"msg": "Forbidden"}), 403
            
            g.user = payload
            return fn(*args, **kwargs)

        return wrapper
    return decorator

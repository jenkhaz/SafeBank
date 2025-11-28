from functools import wraps
from flask import g, jsonify
import sys
import os

# Add parent directory to path to import common module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from common.security.jwt_helpers import decode_jwt


def require_permission(*required):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = decode_jwt()
            if not payload:
                return jsonify({"msg": "Unauthorized"}), 401
            
            user_permissions = set(payload.get("permissions", []))
            user_roles = payload.get("roles", [])
            
            # Check if user has ANY of the required permissions OR is admin
            if not user_permissions.intersection(required) and "admin" not in user_roles:
                return jsonify({"msg": "Forbidden"}), 403
            
            g.user = payload
            return fn(*args, **kwargs)

        return wrapper
    return decorator

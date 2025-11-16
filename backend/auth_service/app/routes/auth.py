from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import jwt

from ..extensions import db
from ..models import User, Role, Permission
from ..security.password import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    data = request.get_json() or {}

    email = data.get("email")
    full_name = data.get("full_name")
    phone = data.get("phone")
    password = data.get("password")

    if not email or not full_name or not password:
        return jsonify({"msg": f"Missing required fields {', '.join([f for f in ['email', 'full_name', 'password'] if not data.get(f)])}"}), 400

    if not password or len(password) < 6:
        return jsonify({"msg": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400

    user = User(
        email=email,
        phone=phone,
        full_name=full_name,
        password_hash=hash_password(password),
    )

    # For now: everyone registers as "customer" role if it exists
    customer_role = Role.query.filter_by(name="customer").first()
    if customer_role:
        user.roles.append(customer_role)

    db.session.add(user)
    db.session.commit()

    return jsonify({"user": user.to_dict_basic()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"msg": "User is inactive"}), 403

    roles = [r.name for r in user.roles]
    permissions = {
        p.code for r in user.roles for p in r.permissions
    }  # union of all permissions

    payload = {
        "sub": user.id,
        "email": user.email,
        "roles": roles,
        "permissions": list(permissions),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iss": "auth_service",
        "aud": "safe_bank",
    }

    token = jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",  # we'll switch to RS256 later if you want
    )

    return jsonify({"access_token": token, "user": user.to_dict_basic()}), 200

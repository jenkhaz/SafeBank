from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime, timedelta
import jwt

from ..extensions import db
from ..models import User, Role, Permission
from ..security.password import hash_password, verify_password
from common.security.jwt_helpers import require_jwt
from common.security.rbac import require_permission

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
        "user_id": user.id,
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


@auth_bp.get("/me/roles-permissions")
@require_jwt
def get_my_roles_and_permissions():
    user_id = g.user.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    roles = [role.name for role in user.roles]
    permissions = sorted({perm.code for role in user.roles for perm in role.permissions})

    return jsonify({"roles": roles, "permissions": permissions}), 200

@auth_bp.post("/admin/change-username-password")
@require_permission("admin")
def admin_change_username_password():
    data = request.get_json() or {}
    user_id = g.user.get("user_id")
    new_email = data.get("email")
    new_password = data.get("password")

    if not new_email and not new_password:
        return jsonify({"msg": "At least one of email or password must be provided"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    if new_email:
        user.email = new_email
    if new_password:
        user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({"msg": "admin credentials updated, please login using the new credentials"}), 200


@auth_bp.post("/admin/edit-user-profile")
@require_permission("users:edit")
def admin_edit_user_roles():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    email = data.get("email", None)  
    full_name = data.get("full_name", None)
    phone = data.get("phone", None)
    is_active = data.get("is_active", None)

    roles_to_add = data.get("roles_to_add", [])
    roles_to_remove = data.get("roles_to_remove", [])

    if not user_id:
        return jsonify({"msg": "user_id is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    if email is not None:
        user.email = email
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    if is_active is not None:
        user.is_active = is_active

    for role_name in roles_to_add:
        role = Role.query.filter_by(name=role_name).first()
        if role and role not in user.roles:
            user.roles.append(role)
    
    for role_name in roles_to_remove:
        role = Role.query.filter_by(name=role_name).first()
        if role and role in user.roles:
            user.roles.remove(role)
    
    db.session.commit()
    return jsonify({"msg": "User roles updated", "user": user.to_dict_basic()}), 200


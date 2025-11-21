from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime, timedelta
import jwt
import re
import logging
import requests

from ..extensions import db, limiter
from ..models import User, Role, Permission
from ..security.password import hash_password, verify_password
from common.security.jwt_helpers import require_jwt, create_jwt
from common.security.rbac import require_permission


auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, ""

@auth_bp.post("/register")
@limiter.limit("5 per hour")
def register():
    data = request.get_json() or {}

    email = data.get("email")
    full_name = data.get("full_name")
    phone = data.get("phone")
    password = data.get("password")

    if not email or not full_name or not password:
        return jsonify({"msg": f"Missing required fields {', '.join([f for f in ['email', 'full_name', 'password'] if not data.get(f)])}"}), 400

    # Validate email format
    if not validate_email(email):
        return jsonify({"msg": "Invalid email format"}), 400

    # Validate password strength
    is_valid, error_msg = validate_password_strength(password)
    if not is_valid:
        return jsonify({"msg": error_msg}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400

    user = User(
        email=email,
        phone=phone,
        full_name=full_name,
        password_hash=hash_password(password),
    )

    # Assign role - default to customer if not specified
    role_name = data.get("role", "customer")
    role = Role.query.filter_by(name=role_name).first()
    
    if not role:
        return jsonify({"msg": f"Invalid role: {role_name}"}), 400
    
    user.roles.append(role)

    db.session.add(user)
    db.session.commit()

    # Log registration to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "auth",
            "action": "register",
            "status": "success",
            "user_id": user.id,
            "user_email": user.email,
            "user_role": role_name,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"role": "{role_name}"}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log registration to audit service: {e}")

    return jsonify({"user": user.to_dict_basic()}), 201


@auth_bp.post("/login")
@limiter.limit("5 per 15 minutes")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        # Log failed login as security event
        try:
            requests.post("http://audit:5005/security/event", json={
                "event_type": "failed_login",
                "severity": "medium",
                "user_email": email,
                "description": "Failed login attempt - invalid credentials",
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "details": f'{{"reason": "invalid_credentials"}}'
            }, timeout=2)
        except Exception as e:
            logger.warning(f"Failed to log security event to audit service: {e}")
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"msg": "User is inactive"}), 403

    # Check if user must change password (e.g., first-time admin login)
    if user.must_change_password:
        return jsonify({
            "msg": "Password change required",
            "must_change_password": True,
            "user_id": user.id
        }), 403

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

    token = create_jwt(payload)

    # Log successful login to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "auth",
            "action": "login",
            "status": "success",
            "user_id": user.id,
            "user_email": user.email,
            "user_role": roles[0] if roles else "unknown",
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"method": "password"}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log login to audit service: {e}")

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


@auth_bp.post("/force-password-change")
@limiter.limit("3 per hour")
def force_password_change():
    """
    Allow users who must change password to do so without a valid JWT.
    Requires correct current credentials.
    """
    data = request.get_json() or {}
    email = data.get("email")
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not email or not current_password or not new_password:
        return jsonify({"msg": "email, current_password, and new_password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(current_password, user.password_hash):
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user.must_change_password:
        return jsonify({"msg": "Password change not required. Use normal login."}), 400

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({"msg": error_msg}), 400

    # Ensure new password is different from current
    if verify_password(new_password, user.password_hash):
        return jsonify({"msg": "New password must be different from current password"}), 400

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.session.commit()

    logger.info(f"User user_id={user.id} completed forced password change")

    # Log password change to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "auth",
            "action": "force_password_change",
            "status": "success",
            "user_id": user.id,
            "user_email": user.email,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": '{"type": "forced_change"}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log password change to audit service: {e}")

    return jsonify({"msg": "Password changed successfully. You can now login with your new password."}), 200


@auth_bp.post("/admin/change-username-password")
@require_permission("admin")
@limiter.limit("10 per hour")
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
        # Validate email format
        if not validate_email(new_email):
            return jsonify({"msg": "Invalid email format"}), 400
        # Check if email already exists
        if User.query.filter_by(email=new_email).first() and user.email != new_email:
            return jsonify({"msg": "Email already in use"}), 400
        user.email = new_email
        logger.info(f"Admin user_id={user_id} changed email")
    
    if new_password:
        # Validate password strength
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({"msg": error_msg}), 400
        user.password_hash = hash_password(new_password)
        # Clear the must_change_password flag when password is changed
        user.must_change_password = False
        logger.info(f"Admin user_id={user_id} changed password")
    
    db.session.commit()

    # Log admin credential change to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "auth",
            "action": "admin_change_credentials",
            "status": "success",
            "user_id": user_id,
            "user_email": user.email,
            "user_role": "admin",
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"changed_email": {"true" if new_email else "false"}, "changed_password": {"true" if new_password else "false"}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log admin credential change to audit service: {e}")

    return jsonify({"msg": "admin credentials updated, please login using the new credentials"}), 200


@auth_bp.post("/admin/edit-user-profile")
@require_permission("users:edit")
@limiter.limit("30 per hour")
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
    
    admin_id = g.user.get("user_id")
    changes = []
    
    if email is not None:
        # Validate email format
        if not validate_email(email):
            return jsonify({"msg": "Invalid email format"}), 400
        # Check if email already exists
        if User.query.filter_by(email=email).first() and user.email != email:
            return jsonify({"msg": "Email already in use"}), 400
        user.email = email
        changes.append(f"email={email}")
    
    if full_name is not None:
        user.full_name = full_name
        changes.append(f"full_name={full_name}")
    
    if phone is not None:
        user.phone = phone
        changes.append(f"phone={phone}")
    
    if is_active is not None:
        user.is_active = is_active
        changes.append(f"is_active={is_active}")

    for role_name in roles_to_add:
        role = Role.query.filter_by(name=role_name).first()
        if role and role not in user.roles:
            user.roles.append(role)
            changes.append(f"added_role={role_name}")
    
    for role_name in roles_to_remove:
        role = Role.query.filter_by(name=role_name).first()
        if role and role in user.roles:
            user.roles.remove(role)
            changes.append(f"removed_role={role_name}")
    
    db.session.commit()
    
    # Audit log
    logger.info(f"Admin user_id={admin_id} edited user_id={user_id}: {', '.join(changes)}")
    
    # Log user profile edit to audit service
    try:
        changes_str = ", ".join(changes)
        requests.post("http://audit:5005/audit/log", json={
            "service": "auth",
            "action": "admin_edit_user_profile",
            "status": "success",
            "user_id": admin_id,
            "user_email": g.user.get("email", "unknown"),
            "user_role": "admin",
            "resource_type": "user",
            "resource_id": str(user_id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"changes": "{changes_str}"}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log user profile edit to audit service: {e}")
    
    return jsonify({"msg": "User profile updated", "user": user.to_dict_basic()}), 200


@auth_bp.get("/admin/list-users")
@require_permission("admin")
def admin_list_users():
    """List all users in the system."""
    users = User.query.all()
    return jsonify({"users": [user.to_dict_basic() for user in users]}), 200


@auth_bp.get("/admin/user/<int:user_id>")
@require_permission("admin")
def admin_get_user(user_id):
    """Get detailed information about a specific user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    return jsonify({"user": user.to_dict_basic()}), 200


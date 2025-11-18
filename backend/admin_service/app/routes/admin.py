from flask import Blueprint, request, jsonify, current_app, g
import requests
from common.security.jwt_helpers import require_jwt
from common.security.rbac import require_permission
from . import admin_bp


@admin_bp.post("/change-credentials")
@require_permission("admin")
def change_admin_credentials():
    """
    Admin changes their own username (email) and/or password.
    This is typically used on first login.
    """
    data = request.get_json() or {}
    new_email = data.get("email")
    new_password = data.get("password")

    if not new_email and not new_password:
        return jsonify({"msg": "At least one of email or password must be provided"}), 400

    # Forward request to auth service with admin's JWT
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.post(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/change-username-password",
            json={"email": new_email, "password": new_password},
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503


@admin_bp.post("/users/edit")
@require_permission("admin")
def edit_user_profile():
    """
    Admin can edit any user's profile and roles.
    Can update: email, full_name, phone, is_active, and roles.
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"msg": "user_id is required"}), 400

    # Forward request to auth service with admin's JWT
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.post(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/edit-user-profile",
            json=data,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503


@admin_bp.post("/users/create-support-agent")
@require_permission("admin")
def create_support_agent():
    """
    Admin creates a new support agent user.
    """
    data = request.get_json() or {}
    email = data.get("email")
    full_name = data.get("full_name")
    phone = data.get("phone")
    password = data.get("password")

    if not email or not full_name or not password:
        return jsonify({"msg": "email, full_name, and password are required"}), 400

    # Forward registration request to auth service
    auth_header = request.headers.get("Authorization", "")
    
    try:
        # First register the user
        response = requests.post(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/register",
            json={
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "password": password
            },
            timeout=10
        )
        
        if response.status_code != 201:
            return jsonify(response.json()), response.status_code
        
        user_data = response.json()
        user_id = user_data.get("user", {}).get("id")
        
        # Then assign support_agent role
        if user_id:
            role_response = requests.post(
                f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/edit-user-profile",
                json={
                    "user_id": user_id,
                    "roles_to_add": ["support_agent"],
                    "roles_to_remove": ["customer"]  # Remove default customer role
                },
                headers={"Authorization": auth_header},
                timeout=10
            )
            
            if role_response.status_code == 200:
                return jsonify({
                    "msg": "Support agent created successfully",
                    "user": role_response.json().get("user")
                }), 201
            else:
                return jsonify({
                    "msg": "User created but failed to assign support_agent role",
                    "user": user_data.get("user")
                }), 207  # Multi-status
        
        return jsonify(user_data), 201
        
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503


@admin_bp.post("/users/create-auditor")
@require_permission("admin")
def create_auditor():
    """
    Admin creates a new auditor user.
    """
    data = request.get_json() or {}
    email = data.get("email")
    full_name = data.get("full_name")
    phone = data.get("phone")
    password = data.get("password")

    if not email or not full_name or not password:
        return jsonify({"msg": "email, full_name, and password are required"}), 400

    # Forward registration request to auth service
    auth_header = request.headers.get("Authorization", "")
    
    try:
        # First register the user
        response = requests.post(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/register",
            json={
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "password": password
            },
            timeout=10
        )
        
        if response.status_code != 201:
            return jsonify(response.json()), response.status_code
        
        user_data = response.json()
        user_id = user_data.get("user", {}).get("id")
        
        # Then assign auditor role
        if user_id:
            role_response = requests.post(
                f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/edit-user-profile",
                json={
                    "user_id": user_id,
                    "roles_to_add": ["auditor"],
                    "roles_to_remove": ["customer"]  # Remove default customer role
                },
                headers={"Authorization": auth_header},
                timeout=10
            )
            
            if role_response.status_code == 200:
                return jsonify({
                    "msg": "Auditor created successfully",
                    "user": role_response.json().get("user")
                }), 201
            else:
                return jsonify({
                    "msg": "User created but failed to assign auditor role",
                    "user": user_data.get("user")
                }), 207  # Multi-status
        
        return jsonify(user_data), 201
        
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503


@admin_bp.get("/users/list")
@require_permission("admin")
def list_all_users():
    """
    Admin can view all users in the system.
    """
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/list-users",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503


@admin_bp.get("/users/<int:user_id>")
@require_permission("admin")
def get_user_details(user_id):
    """
    Admin can view detailed information about a specific user.
    """
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/admin/user/{user_id}",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable. Please try again later."}), 503

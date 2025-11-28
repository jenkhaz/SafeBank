from flask import Blueprint, request, jsonify, current_app, g
import requests
import json
from common.security.jwt_helpers import require_jwt, decode_jwt
from common.security.rbac import require_permission
from . import admin_bp


def log_audit(operation, resource_type, resource_id=None, details=None, status="success", severity="info"):
    """Helper function to log audit events to the audit service."""
    try:
        auth_header = request.headers.get("Authorization", "")
        user_data = g.get("user", {})
        
        audit_data = {
            "user_id": user_data.get("user_id"),
            "action": operation,  # Changed from "operation" to "action"
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", ""),
            "details": json.dumps(details) if details else "{}",  # Convert dict to JSON string
            "status": status,
            "severity": severity,
            "service": "admin"  # Add service identifier
        }
        
        requests.post(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/log",
            json=audit_data,
            headers={"Authorization": auth_header},
            timeout=3
        )
    except Exception as e:
        # Don't fail the request if audit logging fails
        print(f"Failed to log audit event: {e}")


def log_security_event(event_type, description, severity="medium", details=None):
    """Helper function to log security events to the audit service."""
    try:
        auth_header = request.headers.get("Authorization", "")
        user_data = g.get("user", {})
        
        event_data = {
            "user_id": user_data.get("user_id"),
            "event_type": event_type,
            "description": description,
            "severity": severity,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", ""),
            "details": json.dumps(details) if details else "{}",
            "service": "admin"
        }
        
        requests.post(
            f"{current_app.config['AUDIT_SERVICE_URL']}/security/event",
            json=event_data,
            headers={"Authorization": auth_header},
            timeout=3
        )
    except Exception as e:
        # Don't fail the request if security logging fails
        print(f"Failed to log security event: {e}")


@admin_bp.get("/test-auth")
def test_auth():
    """Test endpoint to debug JWT authentication"""
    auth_header = request.headers.get("Authorization", "")
    payload = decode_jwt()
    
    return jsonify({
        "auth_header_present": bool(auth_header),
        "auth_header_format": "Bearer" if auth_header.startswith("Bearer ") else "Invalid",
        "token_decoded": payload is not None,
        "payload": payload if payload else "Failed to decode"
    }), 200


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
        log_audit(
            operation="admin_credential_change",
            resource_type="admin",
            resource_id=g.user.get("user_id"),
            details={"reason": "Missing email or password"},
            status="failure",
            severity="warning"
        )
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
        
        if response.status_code == 200:
            log_audit(
                operation="admin_credential_change",
                resource_type="admin",
                resource_id=g.user.get("user_id"),
                details={
                    "email_changed": bool(new_email),
                    "password_changed": bool(new_password),
                    "new_email": new_email
                },
                status="success",
                severity="high"
            )
        else:
            log_audit(
                operation="admin_credential_change",
                resource_type="admin",
                resource_id=g.user.get("user_id"),
                details={"reason": response.json().get("msg", "Unknown error")},
                status="failure",
                severity="warning"
            )
            # Also log as security event for failed admin credential changes
            log_security_event(
                event_type="failed_admin_credential_change",
                description=f"Failed admin credential change attempt for user {g.user.get('user_id')}",
                severity="high",
                details={
                    "user_id": g.user.get("user_id"),
                    "reason": response.json().get("msg", "Unknown error"),
                    "email_attempted": new_email
                }
            )
        
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        log_audit(
            operation="admin_credential_change",
            resource_type="admin",
            resource_id=g.user.get("user_id"),
            details={"error": str(e)},
            status="failure",
            severity="error"
        )
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
        log_audit(
            operation="user_profile_edit",
            resource_type="user",
            details={"reason": "Missing user_id"},
            status="failure",
            severity="warning"
        )
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
        
        if response.status_code == 200:
            log_audit(
                operation="user_profile_edit",
                resource_type="user",
                resource_id=user_id,
                details={
                    "changes": {k: v for k, v in data.items() if k != "user_id"},
                    "admin_id": g.user.get("user_id")
                },
                status="success",
                severity="high"
            )
        else:
            log_audit(
                operation="user_profile_edit",
                resource_type="user",
                resource_id=user_id,
                details={"reason": response.json().get("msg", "Unknown error")},
                status="failure",
                severity="warning"
            )
        
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        log_audit(
            operation="user_profile_edit",
            resource_type="user",
            resource_id=user_id,
            details={"error": str(e)},
            status="failure",
            severity="error"
        )
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
            log_audit(
                operation="user_creation",
                resource_type="user",
                details={
                    "role": "support_agent",
                    "email": email,
                    "reason": response.json().get("msg", "Registration failed"),
                    "attempted_by": g.user.get("user_id")
                },
                status="failure",
                severity="warning"
            )
            # Log security event for suspicious admin operations (e.g., duplicate user attempts)
            if "already registered" in response.json().get("msg", "").lower():
                log_security_event(
                    event_type="duplicate_user_creation_attempt",
                    description=f"Admin attempted to create duplicate support agent with email {email}",
                    severity="medium",
                    details={
                        "attempted_email": email,
                        "admin_id": g.user.get("user_id"),
                        "role": "support_agent"
                    }
                )
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
                log_audit(
                    operation="user_creation",
                    resource_type="user",
                    resource_id=user_id,
                    details={
                        "role": "support_agent",
                        "email": email,
                        "full_name": full_name,
                        "created_by": g.user.get("user_id")
                    },
                    status="success",
                    severity="high"
                )
                return jsonify({
                    "msg": "Support agent created successfully",
                    "user": role_response.json().get("user")
                }), 201
            else:
                log_audit(
                    operation="user_creation",
                    resource_type="user",
                    resource_id=user_id,
                    details={
                        "role": "support_agent",
                        "email": email,
                        "reason": "Failed to assign role"
                    },
                    status="failure",
                    severity="warning"
                )
                return jsonify({
                    "msg": "User created but failed to assign support_agent role",
                    "user": user_data.get("user")
                }), 207  # Multi-status
        
        return jsonify(user_data), 201
        
    except requests.exceptions.RequestException as e:
        log_audit(
            operation="user_creation",
            resource_type="user",
            details={
                "role": "support_agent",
                "email": email,
                "error": str(e)
            },
            status="failure",
            severity="error"
        )
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
            log_audit(
                operation="user_creation",
                resource_type="user",
                details={
                    "role": "auditor",
                    "email": email,
                    "reason": response.json().get("msg", "Registration failed"),
                    "attempted_by": g.user.get("user_id")
                },
                status="failure",
                severity="warning"
            )
            # Log security event for suspicious admin operations (e.g., duplicate user attempts)
            if "already registered" in response.json().get("msg", "").lower():
                log_security_event(
                    event_type="duplicate_user_creation_attempt",
                    description=f"Admin attempted to create duplicate auditor with email {email}",
                    severity="medium",
                    details={
                        "attempted_email": email,
                        "admin_id": g.user.get("user_id"),
                        "role": "auditor"
                    }
                )
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
                log_audit(
                    operation="user_creation",
                    resource_type="user",
                    resource_id=user_id,
                    details={
                        "role": "auditor",
                        "email": email,
                        "full_name": full_name,
                        "created_by": g.user.get("user_id")
                    },
                    status="success",
                    severity="high"
                )
                return jsonify({
                    "msg": "Auditor created successfully",
                    "user": role_response.json().get("user")
                }), 201
            else:
                log_audit(
                    operation="user_creation",
                    resource_type="user",
                    resource_id=user_id,
                    details={
                        "role": "auditor",
                        "email": email,
                        "reason": "Failed to assign role"
                    },
                    status="failure",
                    severity="warning"
                )
                return jsonify({
                    "msg": "User created but failed to assign auditor role",
                    "user": user_data.get("user")
                }), 207  # Multi-status
        
        return jsonify(user_data), 201
        
    except requests.exceptions.RequestException as e:
        log_audit(
            operation="user_creation",
            resource_type="user",
            details={
                "role": "auditor",
                "email": email,
                "error": str(e)
            },
            status="failure",
            severity="error"
        )
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


# ============= AUDIT LOG VIEWING ENDPOINTS =============

@admin_bp.get("/audit/logs")
@require_permission("admin")
def get_audit_logs():
    """
    Admin can view all audit logs with optional filters.
    Query params: user_id, operation, resource_type, status, severity, start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    
    # Forward all query parameters
    params = request.args.to_dict()
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/logs",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/logs/<int:log_id>")
@require_permission("admin")
def get_audit_log_details(log_id):
    """
    Admin can view detailed information about a specific audit log entry.
    """
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/logs/{log_id}",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/user/<int:user_id>/logs")
@require_permission("admin")
def get_user_audit_logs(user_id):
    """
    Admin can view all audit logs for a specific user.
    Query params: start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/user/{user_id}/logs",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/security-events")
@require_permission("admin")
def get_security_events():
    """
    Admin can view all security events.
    Query params: event_type, severity, user_id, start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/security/events",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/security-events/<int:event_id>")
@require_permission("admin")
def get_security_event_details(event_id):
    """
    Admin can view detailed information about a specific security event.
    """
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/security/events/{event_id}",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/user/<int:user_id>/security-events")
@require_permission("admin")
def get_user_security_events(user_id):
    """
    Admin can view all security events for a specific user.
    Query params: start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    params['user_id'] = user_id  # Add user_id filter
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/security/events",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/statistics")
@require_permission("admin")
def get_audit_statistics():
    """
    Admin can view audit statistics.
    Query params: start_date, end_date
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/stats",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/failed-operations")
@require_permission("admin")
def get_failed_operations():
    """
    Admin can view all failed operations (audit logs with status='failure').
    Query params: user_id, operation, start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    params['status'] = 'failure'  # Force filter to failed operations
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/logs",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


@admin_bp.get("/audit/high-severity")
@require_permission("admin")
def get_high_severity_events():
    """
    Admin can view all high-severity audit logs and security events.
    Query params: start_date, end_date, page, per_page
    """
    auth_header = request.headers.get("Authorization", "")
    params = request.args.to_dict()
    params['severity'] = 'high'  # Force filter to high severity
    
    try:
        response = requests.get(
            f"{current_app.config['AUDIT_SERVICE_URL']}/audit/logs",
            params=params,
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Audit service temporarily unavailable"}), 503


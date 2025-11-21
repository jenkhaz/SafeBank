from flask import request, jsonify, current_app
import requests
from ..security.rbac import require_permission
from . import support_bp


@support_bp.get("/accounts")
@require_permission("accounts:view:any")
def view_all_accounts():
    """Support agent views all customer accounts."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/accounts/admin/all",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable"}), 503


@support_bp.get("/accounts/<int:account_id>")
@require_permission("accounts:view:any")
def view_specific_account(account_id):
    """Support agent views a specific customer account by ID."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/accounts/admin/{account_id}",
            headers={"Authorization": auth_header},
            timeout=10
        )
        # Try to parse JSON, if it fails return the text
        try:
            return jsonify(response.json()), response.status_code
        except:
            return response.text, response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"msg": "Service temporarily unavailable", "error": str(e)}), 503


@support_bp.get("/transactions")
@require_permission("transactions:view:any")
def view_all_transactions():
    """Support agent views all transactions."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/transactions/admin/all",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable"}), 503


@support_bp.get("/transactions/account/<int:account_id>")
@require_permission("transactions:view:any")
def view_transactions_by_account(account_id):
    """Support agent views transactions for a specific account."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/transactions/admin/account/{account_id}",
            headers={"Authorization": auth_header},
            timeout=10
        )
        # Try to parse JSON, if it fails return the text
        try:
            return jsonify(response.json()), response.status_code
        except:
            return response.text, response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"msg": "Service temporarily unavailable", "error": str(e)}), 503


@support_bp.get("/profile")
@require_permission("support_agent")
def get_my_profile():
    """Support agent views their own profile."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['AUTH_SERVICE_URL']}/auth/me/roles-permissions",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable"}), 503


@support_bp.get("/my-account")
@require_permission("accounts:view:own")
def get_my_account():
    """Support agent views their own bank account (if they have one)."""
    auth_header = request.headers.get("Authorization", "")
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/accounts/",
            headers={"Authorization": auth_header},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable"}), 503


@support_bp.get("/my-transactions")
@require_permission("transactions:view:own")
def get_my_transactions():
    """Support agent views their own transactions."""
    auth_header = request.headers.get("Authorization", "")
    
    # Forward query parameters for filtering
    query_params = request.args.to_dict()
    
    try:
        response = requests.get(
            f"{current_app.config['ACCOUNTS_SERVICE_URL']}/transactions/",
            headers={"Authorization": auth_header},
            params=query_params,
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException:
        return jsonify({"msg": "Service temporarily unavailable"}), 503

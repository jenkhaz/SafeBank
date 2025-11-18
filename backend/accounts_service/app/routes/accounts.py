from flask import Blueprint, jsonify, g, request
from ..models.account import Account
from ..extensions import db
from ..security.rbac import require_permission

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.get("/")
@require_permission("accounts:view:own")
def list_my_accounts():
    user_id = g.user["user_id"]
    accounts = Account.query.filter_by(user_id=user_id).all()
    return jsonify([a.to_dict() for a in accounts])


@accounts_bp.post("/")
@require_permission("accounts:create:own")
def create_account():
    data = request.json or {}
    acc_type = data.get("type")

    if acc_type not in ["checking", "savings"]:
        return {"msg": "Invalid account type"}, 400

    new = Account(
        account_number=f"ACCT-{g.user['user_id']}-{Account.query.count()+1}",
        user_id=g.user["user_id"],
        type=acc_type,
        balance=0.0,
    )

    db.session.add(new)
    db.session.commit()
    return new.to_dict(), 201

@accounts_bp.post("/admin/create")
@require_permission("accounts:create:any")
def admin_create_account():
    data = request.json or {}
    user_id = data.get("user_id")
    acc_type = data.get("type")

    if not user_id:
        return {"msg": "user_id is required"}, 400

    if acc_type not in ["checking", "savings"]:
        return {"msg": "Invalid account type"}, 400

    new = Account(
        account_number=f"ACCT-{user_id}-{Account.query.count()+1}",
        user_id=user_id,
        type=acc_type,
        balance=0.0,
    )

    db.session.add(new)
    db.session.commit()
    return new.to_dict(), 201

@accounts_bp.get("/admin/all")
@require_permission("accounts:view:any")
def admin_list_all():
    accounts = Account.query.all()
    return jsonify([a.to_dict() for a in accounts])


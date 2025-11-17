from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models import Transaction, Account
from ..security.rbac import require_permission
from ..services.account_service import (
    internal_transfer,
    external_transfer,
    InsufficientFundsError,
    InvalidAccountError,
    AccountStatusError,
)

bp = Blueprint("transactions", __name__)


@bp.post("/internal")
@require_permission("transfer:internal")
def handle_internal_transfer():
    data = request.get_json() or {}
    sender_id = data.get("sender_account_id")
    receiver_id = data.get("receiver_account_id")
    amount = data.get("amount")
    description = data.get("description")

    if sender_id is None or receiver_id is None or amount is None:
        return {"msg": "sender_account_id, receiver_account_id and amount are required"}, 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"msg": "amount must be a number"}, 400

    try:
        tx = internal_transfer(
            user_id=g.user["user_id"],
            sender_id=sender_id,
            receiver_id=receiver_id,
            amount=amount,
            description=description,
        )
    except ValueError as e:
        return {"msg": str(e)}, 400
    except (InsufficientFundsError, InvalidAccountError, AccountStatusError) as e:
        return {"msg": str(e)}, 400

    return tx.to_dict(), 201


@bp.post("/external")
@require_permission("transfer:external")
def handle_external_transfer():
    data = request.get_json() or {}
    sender_id = data.get("sender_account_id")
    receiver_acc_number = data.get("receiver_account_number")
    amount = data.get("amount")
    description = data.get("description")

    if sender_id is None or receiver_acc_number is None or amount is None:
        return {"msg": "sender_account_id, receiver_account_number and amount are required"}, 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"msg": "amount must be a number"}, 400

    try:
        tx = external_transfer(
            user_id=g.user["user_id"],
            sender_id=sender_id,
            receiver_account_number=receiver_acc_number,
            amount=amount,
            description=description,
        )
    except ValueError as e:
        return {"msg": str(e)}, 400
    except (InsufficientFundsError, InvalidAccountError, AccountStatusError) as e:
        return {"msg": str(e)}, 400

    return tx.to_dict(), 201


@bp.get("/")
@require_permission("transactions:view:own")
def list_my_transactions():
    user_id = g.user["user_id"]

    # get all accounts belonging to this user
    account_ids = [a.id for a in Account.query.filter_by(user_id=user_id).all()]
    if not account_ids:
        return jsonify([])

    txs = (
        Transaction.query
        .filter(
            (Transaction.sender_account_id.in_(account_ids)) | # type: ignore
            (Transaction.receiver_account_id.in_(account_ids)) # type: ignore
        )
        .order_by(Transaction.timestamp.desc()) # type: ignore
        .all()
    )

    return jsonify([t.to_dict() for t in txs])


@bp.get("/admin/all")
@require_permission("transactions:view:any")
def admin_list_all_transactions():
    txs = Transaction.query.order_by(Transaction.timestamp.desc()).all() #type: ignore
    return jsonify([t.to_dict() for t in txs])

@bp.post("/topup")
@require_permission("accounts:topup")
def top_up_account():
    data = request.get_json() or {}
    account_id = data.get("account_id")
    amount = data.get("amount")

    if account_id is None or amount is None:
        return {"msg": "account_id and amount are required"}, 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {"msg": "amount must be a number"}, 400

    if amount <= 0:
        return {"msg": "amount must be positive"}, 400

    account = Account.query.filter_by(id=account_id).first()
    if not account:
        return {"msg": "Account not found"}, 404

    account.balance += amount
    db.session.commit()

    return account.to_dict(), 200

@bp.get("/top-transactions")
@require_permission("transactions:view:own")
def get_top_transactions():
    user_id = g.user["user_id"]
    account_id = request.args.get("account_id")

    if not account_id:
        return {"msg": "account_id is required"}, 400
    
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return {"msg": "Account not found"}, 404
    top_txs = (
        Transaction.query
        .filter(
            (Transaction.sender_account_id == account.id) | # type: ignore
            (Transaction.receiver_account_id == account.id) # type: ignore
        )
        .order_by(Transaction.amount.desc()) # type: ignore
        .limit(5)
        .all()
    )

    return jsonify([t.to_dict() for t in top_txs])

@bp.post("/admin/change-freeze-status")
@require_permission("accounts:freeze:any")
def admin_change_account_freeze_status():
    data = request.get_json() or {}
    account_id = data.get("account_id")
    freeze = data.get("freeze")

    if account_id is None or freeze is None:
        return {"msg": "account_id and freeze are required"}, 400

    account = Account.query.filter_by(id=account_id).first()
    if not account:
        return {"msg": "Account not found"}, 404

    if freeze:
        account.status = "Frozen"
    else:
        account.status = "Active"

    db.session.commit()

    return account.to_dict(), 200
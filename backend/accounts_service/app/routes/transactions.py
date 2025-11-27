from flask import Blueprint, request, jsonify, g, make_response, current_app
from decimal import Decimal, InvalidOperation
from ..extensions import db, limiter
from ..models import Transaction, Account
from ..security.rbac import require_permission
from ..services.account_service import (
    internal_transfer,
    external_transfer,
    InsufficientFundsError,
    InvalidAccountError,
    AccountStatusError,
)
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from datetime import datetime
import requests
import logging

logger = logging.getLogger(__name__)

bp = Blueprint("transactions", __name__)


@bp.post("/internal")
@require_permission("transfer:internal")
@limiter.limit("20 per hour")
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
        if amount <= 0:
            return {"msg": "amount must be positive"}, 400
    except (TypeError, ValueError):
        return {"msg": "amount must be a valid number"}, 400

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

    # Log internal transfer to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "accounts",
            "action": "internal_transfer",
            "status": "success",
            "user_id": g.user["user_id"],
            "user_email": g.user.get("email", "unknown"),
            "user_role": g.user.get("roles", ["unknown"])[0] if g.user.get("roles") else "unknown",
            "resource_type": "transaction",
            "resource_id": str(tx.id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"sender_account_id": {sender_id}, "receiver_account_id": {receiver_id}, "amount": {amount}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log internal transfer to audit service: {e}")

    # Check for suspicious transaction (large amount)
    if amount > 10000:
        try:
            requests.post("http://audit:5005/security/event", json={
                "event_type": "suspicious_transaction",
                "severity": "high",
                "user_id": g.user["user_id"],
                "user_email": g.user.get("email", "unknown"),
                "description": f"Large internal transfer of ${amount:.2f}",
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "details": f'{{"transaction_id": {tx.id}, "amount": {amount}, "type": "internal"}}'
            }, timeout=2)
        except Exception as e:
            logger.warning(f"Failed to log suspicious transaction to audit service: {e}")

    return tx.to_dict(), 201


@bp.post("/external")
@require_permission("transfer:external")
@limiter.limit("10 per hour")
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
        if amount <= 0:
            return {"msg": "amount must be positive"}, 400
    except (TypeError, ValueError):
        return {"msg": "amount must be a valid number"}, 400

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

    # Log external transfer to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "accounts",
            "action": "external_transfer",
            "status": "success",
            "user_id": g.user["user_id"],
            "user_email": g.user.get("email", "unknown"),
            "user_role": g.user.get("roles", ["unknown"])[0] if g.user.get("roles") else "unknown",
            "resource_type": "transaction",
            "resource_id": str(tx.id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"sender_account_id": {sender_id}, "receiver_account_number": "{receiver_acc_number}", "amount": {amount}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log external transfer to audit service: {e}")

    # Check for suspicious external transaction (high amount or potential risk)
    if amount > 5000:
        try:
            requests.post("http://audit:5005/security/event", json={
                "event_type": "suspicious_transaction",
                "severity": "critical" if amount > 50000 else "high",
                "user_id": g.user["user_id"],
                "user_email": g.user.get("email", "unknown"),
                "description": f"Large external transfer of ${amount:.2f} to {receiver_acc_number}",
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "details": f'{{"transaction_id": {tx.id}, "amount": {amount}, "type": "external", "receiver": "{receiver_acc_number}"}}'
            }, timeout=2)
        except Exception as e:
            logger.warning(f"Failed to log suspicious transaction to audit service: {e}")

    return tx.to_dict(), 201


@bp.get("/")
@require_permission("transactions:view:own")
def list_my_transactions():
    user_id = g.user["user_id"]

    # get all accounts belonging to this user
    account_ids = [a.id for a in Account.query.filter_by(user_id=user_id).all()]
    if not account_ids:
        return jsonify([])

    # Start with base query
    query = Transaction.query.filter(
        (Transaction.sender_account_id.in_(account_ids)) | # type: ignore
        (Transaction.receiver_account_id.in_(account_ids)) # type: ignore
    )

    # Filter by date range
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    if start_date:
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp >= start_dt) # type: ignore
        except ValueError:
            return {"msg": "Invalid start_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"}, 400
    
    if end_date:
        try:
            from datetime import datetime
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp <= end_dt) # type: ignore
        except ValueError:
            return {"msg": "Invalid end_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"}, 400

    # Filter by transaction type
    transaction_type = request.args.get("type")
    if transaction_type:
        if transaction_type not in ["internal", "external"]:
            return {"msg": "Invalid type. Must be 'internal' or 'external'"}, 400
        query = query.filter(Transaction.type == transaction_type) # type: ignore

    # Filter by amount range
    min_amount = request.args.get("min_amount")
    max_amount = request.args.get("max_amount")
    
    if min_amount:
        try:
            min_amt = float(min_amount)
            query = query.filter(Transaction.amount >= min_amt) # type: ignore
        except (TypeError, ValueError):
            return {"msg": "Invalid min_amount. Must be a number"}, 400
    
    if max_amount:
        try:
            max_amt = float(max_amount)
            query = query.filter(Transaction.amount <= max_amt) # type: ignore
        except (TypeError, ValueError):
            return {"msg": "Invalid max_amount. Must be a number"}, 400

    # Execute query with sorting
    txs = query.order_by(Transaction.timestamp.desc()).all() # type: ignore

    return jsonify([t.to_dict() for t in txs])


@bp.get("/export-pdf")
@require_permission("transactions:view:own")
def export_transactions_pdf():
    """
    Export transaction history to PDF with optional filters.
    Query params: start_date, end_date, type, min_amount, max_amount
    """
    user_id = g.user["user_id"]

    # get all accounts belonging to this user
    account_ids = [a.id for a in Account.query.filter_by(user_id=user_id).all()]
    if not account_ids:
        return {"msg": "No accounts found"}, 404

    # Build query with same filters as list endpoint
    query = Transaction.query.filter(
        (Transaction.sender_account_id.in_(account_ids)) | # type: ignore
        (Transaction.receiver_account_id.in_(account_ids)) # type: ignore
    )

    # Apply filters (same logic as list_my_transactions)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp >= start_dt) # type: ignore
        except ValueError:
            return {"msg": "Invalid start_date format"}, 400

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp <= end_dt) # type: ignore
        except ValueError:
            return {"msg": "Invalid end_date format"}, 400

    transaction_type = request.args.get("type")
    if transaction_type:
        if transaction_type not in ["internal", "external"]:
            return {"msg": "Invalid type"}, 400
        query = query.filter(Transaction.type == transaction_type) # type: ignore

    min_amount = request.args.get("min_amount")
    max_amount = request.args.get("max_amount")
    
    if min_amount:
        try:
            min_amt = float(min_amount)
            query = query.filter(Transaction.amount >= min_amt) # type: ignore
        except (TypeError, ValueError):
            return {"msg": "Invalid min_amount"}, 400
    
    if max_amount:
        try:
            max_amt = float(max_amount)
            query = query.filter(Transaction.amount <= max_amt) # type: ignore
        except (TypeError, ValueError):
            return {"msg": "Invalid max_amount"}, 400

    # Execute query
    txs = query.order_by(Transaction.timestamp.desc()).all() # type: ignore

    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    title = Paragraph("<b>SafeBank Transaction History</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))

    # User info
    user_info = Paragraph(f"User ID: {user_id}<br/>Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", styles['Normal'])
    elements.append(user_info)
    elements.append(Spacer(1, 0.2*inch))

    # Filters applied
    if any([start_date, end_date, transaction_type, min_amount, max_amount]):
        filters = ["<b>Filters Applied:</b>"]
        if start_date:
            filters.append(f"Start Date: {start_date}")
        if end_date:
            filters.append(f"End Date: {end_date}")
        if transaction_type:
            filters.append(f"Type: {transaction_type}")
        if min_amount:
            filters.append(f"Min Amount: ${min_amount}")
        if max_amount:
            filters.append(f"Max Amount: ${max_amount}")
        
        filter_text = Paragraph("<br/>".join(filters), styles['Normal'])
        elements.append(filter_text)
        elements.append(Spacer(1, 0.2*inch))

    # Transaction table
    if txs:
        table_data = [['Date', 'Type', 'Sender', 'Receiver', 'Amount', 'Description']]
        
        for tx in txs:
            table_data.append([
                tx.timestamp.strftime('%Y-%m-%d %H:%M'),
                tx.type.capitalize(),
                str(tx.sender_account_id),
                str(tx.receiver_account_id),
                f"${tx.amount:.2f}",
                (tx.description or '')[:30]  # Truncate long descriptions
            ])

        table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.9*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(table)

        # Summary
        elements.append(Spacer(1, 0.3*inch))
        total_amount = sum(tx.amount for tx in txs)
        summary = Paragraph(
            f"<b>Total Transactions:</b> {len(txs)}<br/><b>Total Amount:</b> ${total_amount:.2f}",
            styles['Normal']
        )
        elements.append(summary)
    else:
        no_data = Paragraph("<i>No transactions found matching the criteria.</i>", styles['Normal'])
        elements.append(no_data)

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    # Create response
    response = make_response(buffer.read())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=transactions_{user_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf'
    
    return response


@bp.get("/admin/all")
@require_permission("transactions:view:any")
def admin_list_all_transactions():
    txs = Transaction.query.order_by(Transaction.timestamp.desc()).all() #type: ignore
    return jsonify([t.to_dict() for t in txs])


@bp.get("/admin/account/<int:account_id>")
@require_permission("transactions:view:any")
def admin_get_account_transactions(account_id):
    """Admin or support agent views all transactions for a specific account."""
    account = Account.query.get(account_id)
    if not account:
        return {"msg": "Account not found"}, 404
    
    txs = Transaction.query.filter(
        (Transaction.sender_account_id == account_id) | (Transaction.receiver_account_id == account_id)
    ).order_by(Transaction.timestamp.desc()).all()
    
    return jsonify([t.to_dict() for t in txs])


@bp.post("/topup")
@require_permission("accounts:topup")
@limiter.limit("50 per hour")
def top_up_account():
    """Admin/Support agent adds money to any account"""
    data = request.get_json() or {}
    account_id = data.get("account_id")
    amount = data.get("amount")

    if account_id is None or amount is None:
        return {"msg": "account_id and amount are required"}, 400

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return {"msg": "amount must be positive"}, 400
    except (TypeError, ValueError, InvalidOperation):
        return {"msg": "amount must be a valid number"}, 400

    account = Account.query.filter_by(id=account_id).first()
    if not account:
        return {"msg": "Account not found"}, 404

    account.balance += amount_decimal
    db.session.commit()

    return account.to_dict(), 200


@bp.post("/deposit")
@require_permission("accounts:topup")
@limiter.limit("30 per hour")
def deposit_to_own_account():
    """Customer deposits money into their own account"""
    user_id = g.user["user_id"]
    data = request.get_json() or {}
    account_id = data.get("account_id")
    amount = data.get("amount")
    description = data.get("description")

    if account_id is None or amount is None:
        return {"msg": "account_id and amount are required"}, 400

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return {"msg": "amount must be positive"}, 400
    except (TypeError, ValueError, InvalidOperation):
        return {"msg": "amount must be a valid number"}, 400

    # Verify account belongs to user
    account = Account.query.filter_by(id=account_id, user_id=user_id).with_for_update().first()
    if not account:
        return {"msg": "Account not found or does not belong to you"}, 404

    # Check account is active
    if account.status != "Active":
        return {"msg": f"Account is {account.status}. Cannot deposit to inactive account."}, 400

    # Update balance
    old_balance = account.balance
    account.balance += amount_decimal

    # Create a transaction record for deposit (sender = receiver = same account)
    tx = Transaction(
        sender_account_id=account.id,
        receiver_account_id=account.id,
        amount=amount_decimal,
        type="deposit",
        description=description or "Deposit to account",
    )

    db.session.add(tx)
    db.session.commit()

    # Log deposit to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "accounts",
            "action": "deposit",
            "status": "success",
            "user_id": user_id,
            "user_email": g.user.get("email", "unknown"),
            "user_role": g.user.get("roles", ["unknown"])[0] if g.user.get("roles") else "unknown",
            "resource_type": "transaction",
            "resource_id": str(tx.id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"account_id": {account_id}, "amount": {float(amount_decimal)}, "previous_balance": {float(old_balance)}, "new_balance": {float(account.balance)}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log deposit to audit service: {e}")

    return {
        "msg": "Deposit successful",
        "account": account.to_dict(),
        "transaction": tx.to_dict(),
        "previous_balance": float(old_balance),
        "new_balance": float(account.balance)
    }, 201


@bp.post("/withdraw")
@require_permission("accounts:topup")
@limiter.limit("30 per hour")
def withdraw_from_own_account():
    """Customer withdraws money from their own account"""
    user_id = g.user["user_id"]
    data = request.get_json() or {}
    account_id = data.get("account_id")
    amount = data.get("amount")
    description = data.get("description")

    if account_id is None or amount is None:
        return {"msg": "account_id and amount are required"}, 400

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return {"msg": "amount must be positive"}, 400
    except (TypeError, ValueError, InvalidOperation):
        return {"msg": "amount must be a valid number"}, 400

    # Verify account belongs to user
    account = Account.query.filter_by(id=account_id, user_id=user_id).with_for_update().first()
    if not account:
        return {"msg": "Account not found or does not belong to you"}, 404

    # Check account is active
    if account.status != "Active":
        return {"msg": f"Account is {account.status}. Cannot withdraw from inactive account."}, 400

    # Check sufficient balance
    if account.balance < amount_decimal:
        return {"msg": "Insufficient funds"}, 400

    # Update balance
    old_balance = account.balance
    account.balance -= amount_decimal

    # Create a transaction record for withdrawal
    tx = Transaction(
        sender_account_id=account.id,
        receiver_account_id=account.id,
        amount=amount_decimal,
        type="withdrawal",
        description=description or "Withdrawal from account",
    )

    db.session.add(tx)
    db.session.commit()

    # Log withdrawal to audit service
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "accounts",
            "action": "withdrawal",
            "status": "success",
            "user_id": user_id,
            "user_email": g.user.get("email", "unknown"),
            "user_role": g.user.get("roles", ["unknown"])[0] if g.user.get("roles") else "unknown",
            "resource_type": "transaction",
            "resource_id": str(tx.id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"account_id": {account_id}, "amount": {float(amount_decimal)}, "previous_balance": {float(old_balance)}, "new_balance": {float(account.balance)}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log withdrawal to audit service: {e}")

    return {
        "msg": "Withdrawal successful",
        "account": account.to_dict(),
        "transaction": tx.to_dict(),
        "previous_balance": float(old_balance),
        "new_balance": float(account.balance)
    }, 201


@bp.get("/recent-transactions")
@require_permission("transactions:view:own")
def get_recent_transactions():
    """Get the 5 most recent transactions for a specific account."""
    user_id = g.user["user_id"]
    account_id = request.args.get("account_id")

    if not account_id:
        return {"msg": "account_id is required"}, 400
    
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return {"msg": "Account not found"}, 404
    
    recent_txs = (
        Transaction.query
        .filter(
            (Transaction.sender_account_id == account.id) | # type: ignore
            (Transaction.receiver_account_id == account.id) # type: ignore
        )
        .order_by(Transaction.timestamp.desc()) # type: ignore
        .limit(5)
        .all()
    )

    return jsonify([t.to_dict() for t in recent_txs])

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

    # Log account freeze/unfreeze to audit service
    action = "freeze_account" if freeze else "unfreeze_account"
    try:
        requests.post("http://audit:5005/audit/log", json={
            "service": "accounts",
            "action": action,
            "status": "success",
            "user_id": g.user["user_id"],
            "user_email": g.user.get("email", "unknown"),
            "user_role": "admin",
            "resource_type": "account",
            "resource_id": str(account_id),
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "details": f'{{"account_id": {account_id}, "new_status": "{account.status}", "account_owner": {account.user_id}}}'
        }, timeout=2)
    except Exception as e:
        logger.warning(f"Failed to log account {action} to audit service: {e}")

    return account.to_dict(), 200
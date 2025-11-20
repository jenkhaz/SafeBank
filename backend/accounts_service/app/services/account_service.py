from decimal import Decimal
from ..extensions import db
from ..models import Account, Transaction


class InsufficientFundsError(Exception):
    pass


class InvalidAccountError(Exception):
    pass


class AccountStatusError(Exception):
    pass


def _ensure_account_usable(account: Account):
    if account.status != "Active":
        raise AccountStatusError(f"Account {account.account_number} is {account.status}")


def internal_transfer(user_id: int, sender_id: int, receiver_id: int, amount: float, description: str | None = None):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    
    # Convert to Decimal for precise calculations
    amount_decimal = Decimal(str(amount))

    # Lock rows for update to prevent race conditions
    sender = db.session.query(Account).filter_by(id=sender_id).with_for_update().first()
    receiver = db.session.query(Account).filter_by(id=receiver_id).with_for_update().first()

    if not sender:
        raise InvalidAccountError(f"Sender account with ID {sender_id} not found")
    
    if sender.user_id != user_id:
        raise InvalidAccountError(f"Sender account {sender_id} does not belong to you (expected user_id={user_id}, got {sender.user_id})")
    
    if not receiver:
        raise InvalidAccountError(f"Receiver account with ID {receiver_id} not found")
    
    if receiver.user_id != user_id:
        raise InvalidAccountError(f"Receiver account {receiver_id} does not belong to you (expected user_id={user_id}, got {receiver.user_id})")

    _ensure_account_usable(sender)
    _ensure_account_usable(receiver)

    if sender.balance < amount_decimal:
        raise InsufficientFundsError("Insufficient funds")

    sender.balance -= amount_decimal
    receiver.balance += amount_decimal

    tx = Transaction(
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=amount_decimal,
        type="internal",
        description=description or "Internal transfer",
    )

    db.session.add(tx)
    db.session.commit()
    return tx


def external_transfer(user_id: int, sender_id: int, receiver_account_number: str, amount: float, description: str | None = None):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    
    # Convert to Decimal for precise calculations
    amount_decimal = Decimal(str(amount))

    # Lock rows for update to prevent race conditions
    # sender_id is the database ID from the account's id field
    sender = db.session.query(Account).filter_by(id=sender_id).with_for_update().first()
    
    if not sender:
        raise InvalidAccountError(f"Sender account with ID {sender_id} not found")
    
    if sender.user_id != user_id:
        raise InvalidAccountError(f"Account {sender_id} does not belong to you (expected user_id={user_id}, got {sender.user_id})")
    
    receiver = db.session.query(Account).filter_by(account_number=receiver_account_number).with_for_update().first()

    if not receiver:
        raise InvalidAccountError(f"Receiver account {receiver_account_number} not found")

    _ensure_account_usable(sender)
    _ensure_account_usable(receiver)

    if sender.balance < amount_decimal:
        raise InsufficientFundsError("Insufficient funds")

    sender.balance -= amount_decimal
    receiver.balance += amount_decimal

    tx = Transaction(
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=amount_decimal,
        type="external",
        description=description or "External transfer",
    )

    db.session.add(tx)
    db.session.commit()
    return tx

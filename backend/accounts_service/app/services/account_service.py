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

    # Lock rows for update to prevent race conditions
    sender = db.session.query(Account).filter_by(id=sender_id, user_id=user_id).with_for_update().first()
    receiver = db.session.query(Account).filter_by(id=receiver_id, user_id=user_id).with_for_update().first()

    if not sender or not receiver:
        raise InvalidAccountError("One or both accounts not found or not owned by user")

    _ensure_account_usable(sender)
    _ensure_account_usable(receiver)

    if sender.balance < amount:
        raise InsufficientFundsError("Insufficient funds")

    sender.balance -= amount
    receiver.balance += amount

    tx = Transaction(
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=amount,
        type="internal",
        description=description or "Internal transfer",
    )

    db.session.add(tx)
    db.session.commit()
    return tx


def external_transfer(user_id: int, sender_id: int, receiver_account_number: str, amount: float, description: str | None = None):
    if amount <= 0:
        raise ValueError("Amount must be positive")

    # Lock rows for update to prevent race conditions
    sender = db.session.query(Account).filter_by(id=sender_id, user_id=user_id).with_for_update().first()
    receiver = db.session.query(Account).filter_by(account_number=receiver_account_number).with_for_update().first()

    if not sender:
        raise InvalidAccountError("Sender account not found or not owned by user")
    if not receiver:
        raise InvalidAccountError("Receiver account not found")

    _ensure_account_usable(sender)
    _ensure_account_usable(receiver)

    if sender.balance < amount:
        raise InsufficientFundsError("Insufficient funds")

    sender.balance -= amount
    receiver.balance += amount

    tx = Transaction(
        sender_account_id=sender.id,
        receiver_account_id=receiver.id,
        amount=amount,
        type="external",
        description=description or "External transfer",
    )

    db.session.add(tx)
    db.session.commit()
    return tx

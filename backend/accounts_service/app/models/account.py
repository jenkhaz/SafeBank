from datetime import datetime
from ..extensions import db


class Account(db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(32), unique=True, index=True, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)

    type = db.Column(db.String(20), nullable=False)
    balance = db.Column(db.Float, nullable=False, default=0.0)

    status = db.Column(db.String(20), nullable=False, default="Active")  # Active, Frozen, Closed

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    outgoing_transactions = db.relationship(
        "Transaction",
        foreign_keys="Transaction.sender_account_id",
        backref="sender_account",
        lazy="dynamic",
    )

    incoming_transactions = db.relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_account_id",
        backref="receiver_account",
        lazy="dynamic",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "account_number": self.account_number,
            "user_id": self.user_id,
            "type": self.type,
            "balance": self.balance,
            "status": self.status,
        }
    
    def __init__(self, account_number, user_id, type, balance=0.0, status="Active", created_at=None):
        self.account_number = account_number
        self.user_id = user_id
        self.type = type
        self.balance = balance
        self.status = status
        self.created_at = created_at if created_at is not None else datetime.utcnow()

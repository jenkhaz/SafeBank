from datetime import datetime
from ..extensions import db


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)

    sender_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    receiver_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)

    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # "internal" / "external"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    description = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id,
            "sender_account_id": self.sender_account_id,
            "receiver_account_id": self.receiver_account_id,
            "amount": self.amount,
            "type": self.type,
            "timestamp": self.timestamp.isoformat(),
            "description": self.description,
        }

    def __init__(self, sender_account_id, receiver_account_id, amount, type, description=None, timestamp=None):
        self.sender_account_id = sender_account_id
        self.receiver_account_id = receiver_account_id
        self.amount = amount
        self.type = type
        self.description = description
        self.timestamp = timestamp if timestamp is not None else datetime.utcnow()
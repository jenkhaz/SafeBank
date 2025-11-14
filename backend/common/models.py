# backend/common/models.py
from datetime import datetime
from .db import db


# ========== ROLES & USERS ==========

class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(32), unique=True, nullable=False)  # "customer", "support", "auditor", "admin"

    def __repr__(self):
        return f"<Role {self.name}>"


class UserRole(db.Model):
    """
    Many-to-many link between users and roles.
    A user can have multiple roles if needed.
    """
    __tablename__ = "user_roles"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), primary_key=True)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # relationships
    roles = db.relationship(
        "Role",
        secondary="user_roles",
        backref=db.backref("users", lazy="dynamic"),
        lazy="joined",
    )

    accounts = db.relationship(
        "Account",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    tickets_created = db.relationship(
        "SupportTicket",
        foreign_keys="SupportTicket.customer_id",
        back_populates="customer",
    )

    tickets_assigned = db.relationship(
        "SupportTicket",
        foreign_keys="SupportTicket.assigned_agent_id",
        back_populates="assigned_agent",
    )

    audit_logs = db.relationship(
        "AuditLog",
        back_populates="user",
    )

    def __repr__(self):
        return f"<User {self.email}>"


# ========== ACCOUNTS & TRANSACTIONS ==========

class Account(db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(32), unique=True, index=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # e.g. "checking" / "savings"
    type = db.Column(db.String(20), nullable=False)

    opening_balance = db.Column(db.Float, nullable=False, default=0.0)
    balance = db.Column(db.Float, nullable=False, default=0.0)

    # "Active", "Frozen", "Closed"
    status = db.Column(db.String(20), nullable=False, default="Active")

    owner = db.relationship(
        "User",
        back_populates="accounts",
    )

    outgoing_transactions = db.relationship(
        "Transaction",
        foreign_keys="Transaction.sender_account_id",
        back_populates="sender_account",
    )

    incoming_transactions = db.relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_account_id",
        back_populates="receiver_account",
    )

    def __repr__(self):
        return f"<Account {self.account_number} ({self.status})>"


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)

    sender_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    receiver_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)

    amount = db.Column(db.Float, nullable=False)

    # "debit" / "credit" (from sender POV or just descriptive)
    type = db.Column(db.String(20), nullable=False)

    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    description = db.Column(db.String(255))

    sender_account = db.relationship(
        "Account",
        foreign_keys=[sender_account_id],
        back_populates="outgoing_transactions",
    )

    receiver_account = db.relationship(
        "Account",
        foreign_keys=[receiver_account_id],
        back_populates="incoming_transactions",
    )

    def __repr__(self):
        return f"<Transaction {self.id} {self.amount}>"


# ========== SUPPORT TICKETS ==========

class SupportTicket(db.Model):
    __tablename__ = "support_tickets"

    id = db.Column(db.Integer, primary_key=True)

    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_agent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # "Open", "In Progress", "Resolved", etc.
    status = db.Column(db.String(20), nullable=False, default="Open")

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text)  # for support agent’s internal notes

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    customer = db.relationship(
        "User",
        foreign_keys=[customer_id],
        back_populates="tickets_created",
    )

    assigned_agent = db.relationship(
        "User",
        foreign_keys=[assigned_agent_id],
        back_populates="tickets_assigned",
    )

    def __repr__(self):
        return f"<SupportTicket {self.id} {self.status}>"


# ========== AUDIT LOGS ==========

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action_type = db.Column(db.String(50), nullable=False)  # e.g. "LOGIN_SUCCESS", "ACCOUNT_FROZEN"
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ip_address = db.Column(db.String(45))  # IPv4 or IPv6

    user = db.relationship(
        "User",
        back_populates="audit_logs",
    )

    def __repr__(self):
        return f"<AuditLog {self.action_type} at {self.timestamp}>"

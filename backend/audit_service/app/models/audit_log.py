from datetime import datetime
from ..extensions import db


class AuditLog(db.Model):
    """Immutable audit log for all system events."""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Who performed the action
    user_id = db.Column(db.Integer, nullable=True, index=True)  # Nullable for system actions
    user_email = db.Column(db.String(255), nullable=True)
    user_role = db.Column(db.String(50), nullable=True)
    
    # What service and action
    service = db.Column(db.String(50), nullable=False, index=True)  # auth, accounts, support, admin, audit
    action = db.Column(db.String(100), nullable=False, index=True)  # login, create_account, transfer, freeze_account, etc.
    resource_type = db.Column(db.String(50), nullable=True)  # account, transaction, user, ticket, etc.
    resource_id = db.Column(db.String(100), nullable=True, index=True)  # ID of the affected resource
    
    # Details about the action
    status = db.Column(db.String(20), nullable=False)  # success, failure, error
    details = db.Column(db.Text, nullable=True)  # JSON string with additional context
    
    # Network information
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 or IPv6
    user_agent = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "user_email": self.user_email,
            "user_role": self.user_role,
            "service": self.service,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "status": self.status,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }

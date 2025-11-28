from datetime import datetime
from ..extensions import db


class SecurityEvent(db.Model):
    """Security-specific events requiring attention."""
    __tablename__ = "security_events"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Event classification
    event_type = db.Column(db.String(50), nullable=False, index=True)  # failed_login, suspicious_transaction, account_lockout, etc.
    severity = db.Column(db.String(20), nullable=False, index=True)  # low, medium, high, critical
    
    # Who is involved
    user_id = db.Column(db.Integer, nullable=True, index=True)
    user_email = db.Column(db.String(255), nullable=True)
    
    # Event details
    description = db.Column(db.Text, nullable=False)
    details = db.Column(db.Text, nullable=True)  # JSON string with additional context
    
    # Network information
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    # Investigation tracking
    investigated = db.Column(db.Boolean, default=False, nullable=False, index=True)
    investigated_by = db.Column(db.Integer, nullable=True)  # User ID of investigator
    investigated_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type,
            "severity": self.severity,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "description": self.description,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "investigated": self.investigated,
            "investigated_by": self.investigated_by,
            "investigated_at": self.investigated_at.isoformat() if self.investigated_at else None,
            "resolution_notes": self.resolution_notes,
        }

from datetime import datetime
from ..extensions import db


class Ticket(db.Model):
    __tablename__ = "tickets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)  # Customer who created ticket
    
    subject = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    status = db.Column(db.String(20), nullable=False, default="Open")  # Open, In Progress, Resolved, Closed
    priority = db.Column(db.String(20), nullable=False, default="Medium")  # Low, Medium, High, Urgent
    
    assigned_to = db.Column(db.Integer, nullable=True)  # Support agent user_id
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationship to notes
    notes = db.relationship("TicketNote", backref="ticket", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "subject": self.subject,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assigned_to": self.assigned_to,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }

    def __init__(self, user_id, subject, description, priority="Medium", status="Open"):
        self.user_id = user_id
        self.subject = subject
        self.description = description
        self.priority = priority
        self.status = status

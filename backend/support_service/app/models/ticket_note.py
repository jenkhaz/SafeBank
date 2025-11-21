from datetime import datetime
from ..extensions import db


class TicketNote(db.Model):
    __tablename__ = "ticket_notes"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey("tickets.id"), nullable=False)
    
    author_id = db.Column(db.Integer, nullable=False)  # User who wrote the note (customer or support agent)
    author_role = db.Column(db.String(50), nullable=False)  # "customer", "support_agent"
    
    message = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False, nullable=False)  # Internal notes only visible to support agents
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "author_id": self.author_id,
            "author_role": self.author_role,
            "message": self.message,
            "is_internal": self.is_internal,
            "created_at": self.created_at.isoformat(),
        }

    def __init__(self, ticket_id, author_id, author_role, message, is_internal=False):
        self.ticket_id = ticket_id
        self.author_id = author_id
        self.author_role = author_role
        self.message = message
        self.is_internal = is_internal

from datetime import datetime
from ..extensions import db
from .role import user_roles


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    roles = db.relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
        lazy="joined",
    )

    def __init__(self, email, full_name, password_hash, phone=None, is_active=True, created_at=None):
        self.email = email
        self.full_name = full_name
        self.password_hash = password_hash
        self.phone = phone if phone is not None else ""
        self.is_active = is_active
        self.created_at = created_at if created_at is not None else datetime.utcnow()

    def to_dict_basic(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "roles": [r.name for r in self.roles],  # type: ignore
            "is_active": self.is_active,
        }

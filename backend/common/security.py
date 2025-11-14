# backend/common/security.py

from werkzeug.security import generate_password_hash, check_password_hash
from backend.common.db import db
from backend.common.models import Role


def hash_password(plain_password: str) -> str:
    """
    Hash a plaintext password using a strong one-way function.
    """
    return generate_password_hash(plain_password)


def verify_password(hashed_password: str, plain_password: str) -> bool:
    """
    Verify that a plaintext password matches the stored hash.
    """
    return check_password_hash(hashed_password, plain_password)


def get_or_create_role(name: str) -> Role:
    """
    Return a Role with the given name; create it if it doesn't exist.
    """
    role = Role.query.filter_by(name=name).first()
    if not role:
        role = Role(name=name)
        db.session.add(role)
        db.session.commit()
    return role


def create_default_roles():
    """
    Ensure that all core roles exist in the database.
    Called once at app startup from the auth service.
    """
    for name in ["customer", "support", "auditor", "admin"]:
        get_or_create_role(name)

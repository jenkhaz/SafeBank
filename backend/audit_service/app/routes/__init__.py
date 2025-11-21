from flask import Blueprint

audit_bp = Blueprint("audit", __name__)
security_bp = Blueprint("security", __name__)

from . import audit, security

from flask import Blueprint

tickets_bp = Blueprint("tickets", __name__)
support_bp = Blueprint("support", __name__)

from . import tickets, support

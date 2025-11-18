# backend/auth_service/routes.py
# In summary: this code handles user registration, including form rendering, input validation, duplicate email checking, password hashing, and user creation.


from flask import Blueprint, request, jsonify, render_template

#SUBJECT TO CHANGE FROM REND's CODE
from backend.common.db import db
from backend.common.models import User
from backend.common.security import hash_password, get_or_create_role

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/", methods=["GET"])
def index():
    """Root route for auth service"""
    return jsonify({
        "service": "SafeBank Authentication Service",
        "available_routes": {
            "register": "/auth/register (GET/POST)"
        }
    })

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("auth/register.html")

    data = request.form if request.form else request.get_json(force=True)

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    errors = []
    if not full_name:
        errors.append("Full name is required.")
    if not email:
        errors.append("Email is required.")
    if not phone:
        errors.append("Phone is required.")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters.")

    if User.query.filter_by(email=email).first():
        errors.append("An account with this email already exists.")

    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    customer_role = get_or_create_role("customer")

    user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
    )
    user.roles.append(customer_role)
    
    db.session.add(user)
    db.session.commit()

    return jsonify(
        {
            "status": "ok",
            "message": "User registered successfully.",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.roles[0].name if user.roles else None,
            },
        }
    ), 201

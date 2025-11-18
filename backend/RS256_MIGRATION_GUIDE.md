# Add this to auth_service/app/routes/auth.py

# At the top, import the new helper
from common.security.jwt_helpers_rs256 import create_jwt

# Then in the login function, replace the jwt.encode call:

@auth_bp.post("/login")
def login():
    # ... existing validation code ...
    
    payload = {
        "user_id": user.id,
        "email": user.email,
        "roles": roles,
        "permissions": list(permissions),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iss": "auth_service",
        "aud": "safe_bank",
    }

    # OLD (HS256):
    # token = jwt.encode(
    #     payload,
    #     current_app.config["JWT_SECRET_KEY"],
    #     algorithm="HS256",
    # )
    
    # NEW (RS256):
    token = create_jwt(payload)

    return jsonify({"access_token": token, "user": user.to_dict_basic()}), 200

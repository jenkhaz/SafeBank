from . import create_app
from .extensions import db
from .models import Role, Permission, User
from .security.password import hash_password


# ===== PERMISSION DEFINITIONS =====
# Grouped by domain to keep it clean and easy to extend.

ACCOUNT_PERMISSIONS = [
    "accounts:view:own",
    "accounts:view:any",
    "accounts:create:own",
    "accounts:create:any",
    "accounts:topup",
    "accounts:freeze:any",
]

TRANSACTION_PERMISSIONS = [
    "transfer:internal",
    "transfer:external",
    "transactions:view:own",
    "transactions:view:any",
]

USER_PERMISSIONS = [
    "users:edit",   # admin editing other users' profiles/roles
]

TICKET_PERMISSIONS = [
    "tickets:create:own",
    "tickets:view:own",
    "tickets:view:any",
    "tickets:update:any",
]

ADMIN_MISC_PERMISSIONS = [
    "admin",        # used by @require_permission("admin") for admin-only actions
    "support_agent",  # Used to identify support agents
]

ALL_PERMISSION_CODES = (
    ACCOUNT_PERMISSIONS
    + TRANSACTION_PERMISSIONS
    + USER_PERMISSIONS
    + TICKET_PERMISSIONS
    + ADMIN_MISC_PERMISSIONS
)


# ===== ROLE -> PERMISSIONS MAPPING =====
# Adjust this mapping to reflect your RBAC matrix.

ROLE_PERMISSION_MAP = {
    "customer": [
        "accounts:view:own",
        "accounts:create:own",
        "accounts:topup",
        "transfer:internal",
        "transfer:external",
        "transactions:view:own",
        "tickets:create:own",    # Create support tickets
        "tickets:view:own",      # View their own tickets
    ],
    "support_agent": [
        # Support agents can view all accounts and transactions
        "accounts:view:own",     # View their own account
        "accounts:view:any",     # View all customer accounts
        "transactions:view:own", # View their own transactions
        "transactions:view:any", # View all transactions
        "tickets:view:any",      # View all support tickets
        "tickets:update:any",    # Update ticket status and add notes
        "support_agent",         # Support agent identifier
    ],
    "auditor": [
        # Read-only, full visibility
        "accounts:view:any",
        "transactions:view:any",
    ],
    "admin": [
        # Admin gets everything
        *ALL_PERMISSION_CODES,
    ],
}


def seed_permissions():
    """Create all Permission rows and return a dict[code] = Permission."""
    perms_by_code: dict[str, Permission] = {}

    for code in ALL_PERMISSION_CODES:
        perm = Permission.query.filter_by(code=code).first()
        if not perm:
            perm = Permission(code=code, description=code)
            db.session.add(perm)
        perms_by_code[code] = perm

    return perms_by_code


def seed_roles(perms_by_code: dict[str, Permission]):
    """Create roles and attach appropriate permissions based on ROLE_PERMISSION_MAP."""
    roles_by_name: dict[str, Role] = {}

    for role_name, perm_codes in ROLE_PERMISSION_MAP.items():
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name, description=f"{role_name} role")
            db.session.add(role)

        # Ensure the role has exactly (or at least) the mapped permissions
        existing_codes = {p.code for p in role.permissions} # type: ignore
        for code in perm_codes:
            perm = perms_by_code.get(code)
            if perm and code not in existing_codes:
                role.permissions.append(perm)

        roles_by_name[role_name] = role

    return roles_by_name


def seed_default_admin(roles_by_name: dict[str, Role]):
    """Create default admin user if none exists."""
    admin_email = "admin@example.com"
    admin = User.query.filter_by(email=admin_email).first()
    if admin:
        return

    # NOTE: Change this password immediately after first login!
    # Use a strong password in production: mix of uppercase, lowercase, numbers, and symbols
    default_password = "Admin@2024!"
    
    admin_role = roles_by_name.get("admin")
    admin_user = User(
        email=admin_email,
        full_name="Default Admin",
        phone="00000000",  # you can change this
        password_hash=hash_password(default_password),
        is_active=True,
        must_change_password=True,  # Force password change on first login
    )
    if admin_role:
        admin_user.roles.append(admin_role)

    db.session.add(admin_user)
    print(f"⚠️  DEFAULT ADMIN CREATED")
    print(f"    Email: {admin_email}")
    print(f"    Password: {default_password}")
    print(f"    ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!")


def main():
    app = create_app()
    with app.app_context():
        db.create_all()

        perms_by_code = seed_permissions()
        roles_by_name = seed_roles(perms_by_code)
        seed_default_admin(roles_by_name)

        db.session.commit()
        print("Database initialized with roles, permissions, and default admin.")


if __name__ == "__main__":
    main()

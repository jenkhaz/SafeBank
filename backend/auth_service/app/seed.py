from . import create_app
from .extensions import db
from .models import Role, Permission, User
from .security.password import hash_password

#TODO: seed all the roles and all the permissions
def main():
    app = create_app()
    with app.app_context():
        db.create_all()

        # Create permissions (just a couple to start; expand later)
        perms_codes = [
            "accounts:view:own",
            "accounts:view:any",
            "user:manage:any",
        ]

        perms = {}
        for code in perms_codes:
            perm = Permission.query.filter_by(code=code).first()
            if not perm:
                perm = Permission(code=code, description=code)
                db.session.add(perm)
            perms[code] = perm

        # Roles
        customer = Role.query.filter_by(name="customer").first()
        if not customer:
            customer = Role(name="customer", description="Bank customer")
            customer.permissions.append(perms["accounts:view:own"])
            db.session.add(customer)

        admin = Role.query.filter_by(name="admin").first()
        if not admin:
            admin = Role(name="admin", description="Administrator")
            admin.permissions.extend(perms.values())
            db.session.add(admin)

        # Create default admin user if none
        if not User.query.filter_by(email="admin@example.com").first():
            admin_user = User(
                email="admin@example.com",
                full_name="Default Admin",
                password_hash=hash_password("admin123"),
            )
            admin_user.roles.append(admin)
            db.session.add(admin_user)

        db.session.commit()
        print("Database initialized with roles, permissions, and default admin.")


if __name__ == "__main__":
    main()

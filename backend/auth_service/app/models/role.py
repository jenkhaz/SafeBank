from ..extensions import db

user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("role_id", db.Integer, db.ForeignKey("role.id"), primary_key=True),
)

role_permissions = db.Table(
    "role_permissions",
    db.Column("role_id", db.Integer, db.ForeignKey("role.id"), primary_key=True),
    db.Column(
        "permission_id", db.Integer, db.ForeignKey("permission.id"), primary_key=True
    ),
)


class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.String(255))

    users = db.relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
        lazy="selectin",
    )

    permissions = db.relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="joined",
    )

    def __init__(self, name, description=None):
        self.name = name
        self.description = description


class Permission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.String(255))

    roles = db.relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions",
        lazy="selectin",
    )

    def __init__(self, code, description=None):
        self.code = code
        self.description = description

from . import create_app
from .extensions import db

def main():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("Accounts DB ready.")

if __name__ == "__main__":
    main()

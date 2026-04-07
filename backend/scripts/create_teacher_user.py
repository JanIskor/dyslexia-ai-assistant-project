import argparse
import uuid

from app.db.session import SessionLocal
from app.models.user import User
from app.services.auth_service import get_password_hash, normalize_email


def create_teacher(email: str, password: str) -> None:
    db = SessionLocal()

    try:
        normalized_email = normalize_email(email)
        existing_user = db.query(User).filter(User.email == normalized_email).first()

        if existing_user:
            existing_user.password_hash = get_password_hash(password)
            existing_user.role = "teacher"
            db.commit()
            print(f"Updated local teacher user: {normalized_email}")
            return

        teacher_user = User(
            id=uuid.uuid4(),
            email=normalized_email,
            password_hash=get_password_hash(password),
            role="teacher",
        )
        db.add(teacher_user)
        db.commit()
        db.refresh(teacher_user)
        print(f"Created local teacher user: {normalized_email}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update a local teacher user for manual dashboard testing."
    )
    parser.add_argument("--email", required=True, help="Teacher login email")
    parser.add_argument("--password", required=True, help="Teacher login password")
    args = parser.parse_args()

    create_teacher(args.email, args.password)


if __name__ == "__main__":
    main()

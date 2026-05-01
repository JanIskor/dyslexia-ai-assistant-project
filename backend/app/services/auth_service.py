from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import RegisterRequest, UserResponse

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def normalize_email(email: str) -> str:
    return email.strip().lower()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = normalize_email(email)
    return db.query(User).filter(User.email == normalized_email).first()

def create_user(db: Session, user: RegisterRequest) -> UserResponse:
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=normalize_email(user.email),
        password_hash=hashed_password,
        role="student",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return UserResponse.model_validate(db_user)

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

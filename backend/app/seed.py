from app.config import get_settings
from app.database import SessionLocal
from app.models import User, UserRole
from app.services.crypto import hash_password

settings = get_settings()


def seed() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "vendor@kwickink.campus").first():
            db.add(
                User(
                    name="Shopkeeper",
                    email="vendor@kwickink.campus",
                    password_hash=hash_password(settings.seed_vendor_password),
                    role=UserRole.VENDOR,
                )
            )
        if not db.query(User).filter(User.email == "student@campus.edu").first():
            db.add(
                User(
                    name="Asha Rao",
                    email="student@campus.edu",
                    password_hash=hash_password(settings.seed_student_password),
                    role=UserRole.STUDENT,
                )
            )
        db.commit()
    finally:
        db.close()

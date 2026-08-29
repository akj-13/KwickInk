from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import create_token, get_current_user
from app.models import User, UserRole
from app.services.crypto import hash_password, verify_password
from app.services.ratelimit import client_ip, limiter

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


@router.post("/register")
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)):
    limiter.check(f"register:{client_ip(request)}", 8, 60)
    if body.role == UserRole.VENDOR:
        raise HTTPException(400, "Vendor accounts are provisioned by the shop")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(409, "Email already registered")
    user = User(
        name=body.name.strip(),
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "token": create_token(user),
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value},
    }


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    limiter.check(f"login:{client_ip(request)}", 10, 60)
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {
        "token": create_token(user),
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value},
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value}

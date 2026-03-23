from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.user_schemas import UserCreate, UserOut

router = APIRouter()


@router.post("", response_model=UserOut)
def create_user(payload: UserCreate):
    with db_session() as db:
        exists = db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=409, detail="Phone already registered")
        user = User(phone=payload.phone, email=str(payload.email) if payload.email else None, full_name=payload.full_name, category=payload.category)
        db.add(user)
        db.flush()
        wallet = Wallet(user_id=user.id, balance_kobo=0)
        db.add(wallet)
        db.flush()
        return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user


from typing import Dict

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database import db_session, get_db
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.user_schemas import UserCreate, UserOut, UserUpdate, SecurityUpdate
from app.infrastructure.auth import get_current_user_id
from app.services.security_service import security_service
from app.core.rate_limit import limiter


router = APIRouter()


@router.post("", response_model=UserOut)
@limiter.limit("5/hour")
def create_user(request: Request, payload: UserCreate):
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
        db.commit()
        db.refresh(user)
        return user


@router.get("/me", response_model=UserOut)
def get_current_user(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user


@router.patch("/me", response_model=UserOut)
def update_current_user(payload: UserUpdate, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
            
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


@router.patch("/me/security", response_model=UserOut)
def update_security(payload: SecurityUpdate, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if payload.security_type:
            user.security_type = payload.security_type
            
        if payload.new_pin:
            # Use Argon2 for PIN hashing (Enterprise-Hardened)
            user.hashed_pin = security_service.hash_secret(payload.new_pin)
            
        if payload.new_pattern:
            # Use Argon2 for Pattern hashing
            user.hashed_pattern = security_service.hash_secret(payload.new_pattern)
            
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


@router.post("/me/verify-security", response_model=Dict[str, bool])
@limiter.limit("10/minute")
def verify_security(
    request: Request,
    payload: Dict[str, str], # {"pin": "..."} or {"pattern": "..."}
    user_id: str = Depends(get_current_user_id)
):
    """Verify PIN or Pattern for application lock screen."""
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        pin = payload.get("pin")
        pattern = payload.get("pattern")
        
        if pin:
            if not user.hashed_pin:
                raise HTTPException(status_code=400, detail="PIN not set")
            is_valid = security_service.verify_secret(user.hashed_pin, pin)
            return {"valid": is_valid}
            
        if pattern:
            if not user.hashed_pattern:
                raise HTTPException(status_code=400, detail="Pattern not set")
            is_valid = security_service.verify_secret(user.hashed_pattern, pattern)
            return {"valid": is_valid}
            
        raise HTTPException(status_code=400, detail="PIN or Pattern required")


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    with db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

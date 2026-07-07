"""
POST /auth/phone/send-otp   — send a 6-digit SMS OTP (unauthenticated)
POST /auth/phone/verify-otp — verify code, return Supabase session (unauthenticated)
"""
from __future__ import annotations

import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.database import get_db
from app.models.phone_otp import PhoneOtp
from app.services.sms_provider import get_sms_provider

router = APIRouter()

_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")

RATE_LIMIT_MAX  = 6    # sends per window
RATE_LIMIT_MINS = 15   # minutes
OTP_EXPIRY_MINS = 5    # minutes
MAX_ATTEMPTS    = 5    # verify attempts before OTP is voided


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _E164_RE.match(v):
            raise ValueError("Phone must be in E.164 format, e.g. +2348012345678")
        return v


class SendOtpResponse(BaseModel):
    message: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _E164_RE.match(v):
            raise ValueError("Phone must be in E.164 format, e.g. +2348012345678")
        return v

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Code must be 6 digits")
        return v


class SupabaseSession(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class VerifyOtpResponse(BaseModel):
    message: str
    session: SupabaseSession
    user_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _count_recent_sends(db: Session, phone: str) -> int:
    window = _now() - timedelta(minutes=RATE_LIMIT_MINS)
    return db.execute(
        select(func.count(PhoneOtp.id)).where(
            PhoneOtp.phone == phone,
            PhoneOtp.created_at >= window,
        )
    ).scalar() or 0


def _get_latest_pending(db: Session, phone: str) -> PhoneOtp | None:
    return db.execute(
        select(PhoneOtp).where(
            PhoneOtp.phone == phone,
            PhoneOtp.verified == False,
            PhoneOtp.expires_at > _now(),
        ).order_by(PhoneOtp.created_at.desc()).limit(1)
    ).scalar_one_or_none()


_PLACEHOLDER_KEYS = {
    "", "your_service_role_key", "your_service_role_key_here",
    "your_supabase_service_key", "changeme",
}


def _supabase_configured() -> bool:
    return (
        bool(settings.supabase_url)
        and settings.supabase_url.startswith("http")
        and bool(settings.supabase_service_key)
        and settings.supabase_service_key not in _PLACEHOLDER_KEYS
    )


def _supabase_create_or_get_user(phone: str) -> dict:
    """
    Creates a Supabase user for this phone (or finds the existing one).
    Returns the Supabase user dict.
    Uses a synthetic internal email so magic-link session generation works.
    """
    if not _supabase_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Phone verification is not fully configured. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role key) "
                "in backend/.env, then run: "
                "docker compose up -d --force-recreate core-banking"
            ),
        )

    digits = re.sub(r"\D", "", phone)
    synthetic_email = f"phone_{digits}@phone.ventureroot.internal"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    admin_url = f"{settings.supabase_url}/auth/v1/admin"

    with httpx.Client(timeout=15) as client:
        # Try to create the user
        create_resp = client.post(
            f"{admin_url}/users",
            headers=headers,
            json={
                "email": synthetic_email,
                "phone": phone,
                "phone_confirm": True,
                "email_confirm": True,
                "user_metadata": {"phone": phone, "auth_method": "phone_otp"},
            },
        )
        if create_resp.is_success:
            return create_resp.json()

        # User already exists — find by email
        search_resp = client.get(
            f"{admin_url}/users",
            headers=headers,
            params={"filter": f"email.eq.{synthetic_email}"},
        )
        if not search_resp.is_success:
            raise HTTPException(status_code=502, detail="Could not create or find user")
        users = search_resp.json().get("users", [])
        if not users:
            raise HTTPException(status_code=502, detail="User not found after create attempt")
        return users[0]


def _supabase_generate_session(user_email: str) -> dict:
    """Generate a magic-link and return its embedded session tokens."""
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    admin_url = f"{settings.supabase_url}/auth/v1/admin"

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{admin_url}/generate_link",
            headers=headers,
            json={"type": "magiclink", "email": user_email},
        )
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Session generation failed: {resp.text[:200]}")

    data = resp.json()
    props = data.get("properties", {})
    access_token = props.get("access_token") or data.get("access_token")
    refresh_token = props.get("refresh_token") or data.get("refresh_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="No access_token in Supabase response")
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token or "",
        "token_type":    "bearer",
        "expires_in":    props.get("expires_in", 3600),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-otp", response_model=SendOtpResponse)
def send_phone_otp(body: SendOtpRequest, db: Session = Depends(get_db)):
    recent = _count_recent_sends(db, body.phone)
    if recent >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Max {RATE_LIMIT_MAX} per {RATE_LIMIT_MINS} minutes.",
        )

    code = "".join(secrets.choice("0123456789") for _ in range(6))
    otp_hash = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()

    record = PhoneOtp(
        id=str(uuid.uuid4()),
        phone=body.phone,
        otp_hash=otp_hash,
        expires_at=_now() + timedelta(minutes=OTP_EXPIRY_MINS),
        created_at=_now(),
    )
    db.add(record)
    db.commit()

    sms = get_sms_provider()
    sms.send(body.phone, f"Your VentureRoot code is {code}. Valid for {OTP_EXPIRY_MINS} mins. Do not share.")

    return SendOtpResponse(message="Verification code sent.")


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_phone_otp(body: VerifyOtpRequest, db: Session = Depends(get_db)):
    record = _get_latest_pending(db, body.phone)
    if record is None:
        raise HTTPException(status_code=400, detail="No active OTP found. Request a new code.")

    if record.attempts >= MAX_ATTEMPTS:
        record.verified = True  # void it
        db.commit()
        raise HTTPException(status_code=400, detail="Too many failed attempts. Request a new code.")

    if not bcrypt.checkpw(body.code.encode(), record.otp_hash.encode()):
        record.attempts += 1
        db.commit()
        remaining = MAX_ATTEMPTS - record.attempts
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect code. {remaining} attempt(s) remaining.",
        )

    # Mark this one verified and void all other pending OTPs for this phone
    record.verified = True
    db.execute(
        PhoneOtp.__table__.update()
        .where(PhoneOtp.phone == body.phone)
        .where(PhoneOtp.id != record.id)
        .where(PhoneOtp.verified == False)
        .values(verified=True)
    )
    db.commit()

    user = _supabase_create_or_get_user(body.phone)
    user_email = user.get("email", "")
    session_data = _supabase_generate_session(user_email)

    return VerifyOtpResponse(
        message="Phone verified.",
        session=SupabaseSession(**session_data),
        user_id=user.get("id", ""),
    )

"""
Forgotten-password recovery via SMS OTP — deliberately unauthenticated
(a locked-out user has no token to present) and deliberately doesn't reveal
whether a phone number is registered, to avoid turning this into a phone
enumeration endpoint.

Flow: POST /request (phone) -> SMS OTP goes out if that phone is registered
      POST /confirm (phone, code, new_password) -> verifies the OTP, then
      sets the password directly via Supabase's Admin API (see
      supabase_admin_service.py) — there is no logged-in session to update
      via the normal client-side auth.updateUser() call.

Note: deliberately no `from __future__ import annotations` here — combined
with slowapi's @limiter.limit decorator it breaks FastAPI's ability to
resolve the Pydantic body model from the (stringified) type hint, and it
silently starts looking for `payload` as a query parameter instead (404s
with "field required" on every call). No other endpoint file in this
codebase combines both, which is presumably why this hadn't surfaced before.
"""
import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app.core.rate_limit import limiter
from app.infrastructure.database import db_session
from app.models.user import User
from app.services.otp_service import OtpError, send_otp, verify_otp
from app.services.supabase_admin_service import SupabaseAdminError, set_user_password

router = APIRouter()
logger = logging.getLogger(__name__)

_GENERIC_REQUEST_MESSAGE = (
    "If that phone number is registered, a verification code has been sent via SMS."
)


def _validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not any(c.isupper() for c in password):
        raise ValueError("Include at least one uppercase letter (A-Z).")
    if not any(c.isdigit() for c in password):
        raise ValueError("Include at least one number (0-9).")
    if all(c.isalnum() for c in password):
        raise ValueError("Include at least one special character.")
    return password


class PasswordResetRequestIn(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return v.strip()


class PasswordResetConfirmIn(BaseModel):
    phone: str
    code: str
    new_password: str

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return v.strip()

    @field_validator("code")
    @classmethod
    def digits_only(cls, v: str) -> str:
        cleaned = v.replace(" ", "")
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Code must be exactly 6 digits.")
        return cleaned

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class PasswordResetResponse(BaseModel):
    success: bool
    message: str


@router.post("/request", response_model=PasswordResetResponse)
@limiter.limit("5/hour")
def request_password_reset(request: Request, payload: PasswordResetRequestIn):
    with db_session() as db:
        user = db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none()
        if user is not None:
            try:
                send_otp(db, target=payload.phone, channel="sms", purpose="password_reset")
            except OtpError:
                # Rate limit already covers repeat-request abuse; a specific
                # OtpError here (e.g. window exceeded) shouldn't leak via a
                # different response shape than the "not registered" case.
                pass
            except Exception:
                logger.exception("password reset OTP dispatch failed for a registered phone")

    return PasswordResetResponse(success=True, message=_GENERIC_REQUEST_MESSAGE)


@router.post("/confirm", response_model=PasswordResetResponse)
@limiter.limit("10/hour")
def confirm_password_reset(request: Request, payload: PasswordResetConfirmIn):
    with db_session() as db:
        user = db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none()
        if user is None:
            # Same OTP verification path runs regardless, so a wrong phone
            # number doesn't respond any faster than a wrong code would —
            # avoids a timing signal that would reveal registered numbers.
            try:
                verify_otp(db, target=payload.phone, channel="sms", code=payload.code)
            except OtpError:
                pass
            raise HTTPException(status_code=400, detail="Incorrect code, or no active reset request for this number.")

        try:
            verify_otp(db, target=payload.phone, channel="sms", code=payload.code)
        except OtpError as e:
            raise HTTPException(status_code=400, detail=str(e))

    try:
        set_user_password(user.id, payload.new_password)
    except SupabaseAdminError as e:
        logger.exception("password reset: failed to set Supabase password for user %s", user.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not update your password: {e}",
        )

    return PasswordResetResponse(success=True, message="Password updated. You can now sign in with your new password.")

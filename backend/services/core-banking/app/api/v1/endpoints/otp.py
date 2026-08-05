"""
OTP API — send and verify one-time passwords via SMS and email together.
Every OTP goes out on both channels so a delivery problem on one doesn't
block verification; either channel's code works. Rate limited: 3 sends per
target per 10 minutes, per channel.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.api import deps
from app.services.otp_service import OtpError, send_otp_multi, verify_otp_multi

router = APIRouter()


class OtpSendRequest(BaseModel):
    phone: str          # E.164 phone (+2348012345678)
    email: str
    purpose: str = "phone_verify"

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class OtpVerifyRequest(BaseModel):
    phone: str
    email: str
    code: str

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("code")
    @classmethod
    def digits_only(cls, v: str) -> str:
        cleaned = v.replace(" ", "")
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Code must be exactly 6 digits.")
        return cleaned


class OtpResponse(BaseModel):
    success: bool
    message: str
    sms_sent: bool = False
    email_sent: bool = False


@router.post("/send", response_model=OtpResponse, status_code=status.HTTP_200_OK)
def send(
    req: OtpSendRequest,
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """
    Send a 6-digit OTP to both the supplied phone (SMS via Termii) and email
    address, sharing one code. Max 3 requests per target per 10 minutes.
    """
    try:
        result = send_otp_multi(db, req.phone, req.email, req.purpose)
    except OtpError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to dispatch OTP: {str(e)}",
        )

    sms_sent = result["sms"]["sent"]
    email_sent = result["email"]["sent"]
    if sms_sent and email_sent:
        message = "Verification code sent via SMS and email. Valid for 10 minutes."
    elif sms_sent:
        message = "Verification code sent via SMS. Email delivery failed — the SMS code still works."
    elif email_sent:
        message = "Verification code sent via email. SMS delivery failed — the email code still works."
    else:
        message = "Verification code generated. Delivery is not configured on this server yet — check server logs."

    return OtpResponse(success=True, message=message, sms_sent=sms_sent, email_sent=email_sent)


@router.post("/verify", response_model=OtpResponse, status_code=status.HTTP_200_OK)
def verify(
    req: OtpVerifyRequest,
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """
    Verify a 6-digit OTP against whichever channel it was actually sent
    through. Returns 200 on success, 400 on wrong/expired code.
    """
    try:
        verify_otp_multi(db, req.phone, req.email, req.code)
    except OtpError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return OtpResponse(success=True, message="Phone and email verified successfully.")

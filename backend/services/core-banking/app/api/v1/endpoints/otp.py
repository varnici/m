"""
OTP API — send and verify one-time passwords via SMS or email.
Rate limited: 3 sends per target per 10 minutes.
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.api import deps
from app.services.otp_service import OtpError, send_otp, verify_otp

router = APIRouter()


class OtpSendRequest(BaseModel):
    target: str          # E.164 phone (+2348012345678) or email
    channel: Literal["sms", "email"]
    purpose: str = "phone_verify"

    @field_validator("target")
    @classmethod
    def clean_target(cls, v: str) -> str:
        return v.strip().lower() if "@" in v else v.strip()


class OtpVerifyRequest(BaseModel):
    target: str
    channel: Literal["sms", "email"]
    code: str

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


@router.post("/send", response_model=OtpResponse, status_code=status.HTTP_200_OK)
def send(
    req: OtpSendRequest,
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """
    Send a 6-digit OTP to the supplied phone (SMS via Termii) or email address.
    Max 3 requests per target per 10 minutes to prevent SMS cost abuse.
    """
    try:
        send_otp(db, req.target, req.channel, req.purpose)
    except OtpError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to dispatch OTP: {str(e)}",
        )
    channel_label = "SMS" if req.channel == "sms" else "email"
    return OtpResponse(
        success=True,
        message=f"Verification code sent via {channel_label}. Valid for 10 minutes.",
    )


@router.post("/verify", response_model=OtpResponse, status_code=status.HTTP_200_OK)
def verify(
    req: OtpVerifyRequest,
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """
    Verify a 6-digit OTP. Returns 200 on success, 400 on wrong/expired code.
    """
    try:
        verify_otp(db, req.target, req.channel, req.code)
    except OtpError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return OtpResponse(success=True, message="Phone number verified successfully.")

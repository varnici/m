"""
OTP Service — multi-channel (SMS via Termii, email via SMTP)
with rate limiting and SHA-256 code storage.

Rate limit: max 3 sends per target per 10 minutes.
Expiry:     10 minutes from issue.
Verification: max 5 wrong attempts before OTP is voided.
"""
from __future__ import annotations

import hashlib
import random
import smtplib
import string
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Literal

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.platform_metrics import OtpRecord

OtpChannel = Literal["sms", "email"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


# ── Rate limit check ──────────────────────────────────────────────────────────

def _count_recent_sends(db: Session, target: str, channel: OtpChannel) -> int:
    window_start = _now() - timedelta(minutes=10)
    return db.execute(
        select(func.count(OtpRecord.id)).where(
            OtpRecord.target == target,
            OtpRecord.channel == channel,
            OtpRecord.created_at >= window_start,
        )
    ).scalar() or 0


# ── SMS via Termii ────────────────────────────────────────────────────────────

_DEV_MODE = True   # flip to False in production once credentials are set


def _dev_log(channel: str, target: str, code: str, reason: str = "") -> None:
    """Clearly visible log for dev/test — read with: docker compose logs core-banking"""
    suffix = f" ({reason})" if reason else ""
    print(f"\n{'='*55}")
    print(f"  VentureRoot OTP [{channel.upper()}]{suffix}")
    print(f"  To   : {target}")
    print(f"  Code : {code}")
    print(f"{'='*55}\n")


def _send_sms_termii(phone: str, code: str) -> None:
    if not settings.termii_api_key:
        _dev_log("sms", phone, code, "Termii key not configured")
        return

    try:
        payload = {
            "to": phone,
            "from": settings.termii_sender_id,
            "sms": f"Your VentureRoot code is {code}. Valid 10 mins. Do not share.",
            "type": "plain",
            "channel": settings.termii_channel,
            "api_key": settings.termii_api_key,
        }
        with httpx.Client(timeout=10) as client:
            resp = client.post(f"{settings.termii_base_url}/sms/send", json=payload)
            if not resp.is_success:
                raise RuntimeError(
                    f"Termii {resp.status_code}: {resp.text[:200]}"
                )
    except Exception as exc:
        _dev_log("sms", phone, code, f"Termii error: {exc}")
        if not _DEV_MODE:
            raise


# ── Email via SMTP ────────────────────────────────────────────────────────────

_PLACEHOLDER_PASSWORDS = {"your_gmail_app_password_here", "", "changeme", "your_password"}


def _smtp_configured() -> bool:
    return (
        bool(settings.smtp_user)
        and bool(settings.smtp_password)
        and settings.smtp_password.lower() not in _PLACEHOLDER_PASSWORDS
    )


def _send_email_otp(email: str, code: str) -> None:
    if not _smtp_configured():
        _dev_log("email", email, code, "SMTP not configured")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"VentureRoot verification code: {code}"
    msg["From"]    = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"]      = email

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#004D2C;padding:24px;text-align:center">
        <h2 style="color:#fff;margin:0">VentureRoot</h2>
      </div>
      <div style="padding:32px;background:#f8fafc">
        <p style="font-size:16px;color:#0F172A">Your one-time verification code is:</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:8px;color:#004D2C;
                    text-align:center;padding:20px;background:#fff;border-radius:12px;
                    border:2px solid #D1FAE5;margin:16px 0">
          {code}
        </div>
        <p style="font-size:13px;color:#64748B">
          This code expires in <strong>10 minutes</strong>.
          Do not share it with anyone. VentureRoot will never ask for this code.
        </p>
      </div>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, email, msg.as_string())
    except Exception as exc:
        _dev_log("email", email, code, f"SMTP error: {exc}")
        if not _DEV_MODE:
            raise


# ── Public API ────────────────────────────────────────────────────────────────

class OtpError(Exception):
    """Raised for rate-limit or verification failures."""


def send_otp(
    db: Session,
    target: str,
    channel: OtpChannel,
    purpose: str = "phone_verify",
) -> None:
    """
    Generate and dispatch a fresh OTP.

    Raises OtpError if the rate limit (3 per 10 min) is exceeded.
    """
    recent = _count_recent_sends(db, target, channel)
    if recent >= settings.otp_max_per_window:
        raise OtpError(
            f"Too many OTP requests. Maximum {settings.otp_max_per_window} "
            "per 10 minutes. Please wait before requesting again."
        )

    code = _generate_code()
    record = OtpRecord(
        target=target,
        channel=channel,
        code_hash=_hash_code(code),
        purpose=purpose,
        expires_at=_now() + timedelta(minutes=settings.otp_expiry_minutes),
    )
    db.add(record)
    db.commit()

    if channel == "sms":
        _send_sms_termii(target, code)
    else:
        _send_email_otp(target, code)


def verify_otp(
    db: Session,
    target: str,
    channel: OtpChannel,
    code: str,
) -> bool:
    """
    Verify the most recent unused, unexpired OTP for `target`.

    Returns True on success, raises OtpError on failure.
    """
    record: OtpRecord | None = db.execute(
        select(OtpRecord).where(
            OtpRecord.target == target,
            OtpRecord.channel == channel,
            OtpRecord.is_used == False,
            OtpRecord.expires_at > _now(),
        ).order_by(OtpRecord.created_at.desc()).limit(1)
    ).scalar_one_or_none()

    if record is None:
        raise OtpError("No active OTP found. Please request a new code.")

    if record.attempts >= settings.otp_max_verify_attempts:
        record.is_used = True
        db.commit()
        raise OtpError("Too many failed attempts. Please request a new code.")

    if record.code_hash != _hash_code(code):
        record.attempts += 1
        db.commit()
        remaining = settings.otp_max_verify_attempts - record.attempts
        raise OtpError(f"Incorrect code. {remaining} attempt(s) remaining.")

    record.is_used = True
    db.commit()
    return True

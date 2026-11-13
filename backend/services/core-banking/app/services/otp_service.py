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

def _is_dev_mode() -> bool:
    return settings.env == "dev"


def _dev_log(channel: str, target: str, code: str, reason: str = "") -> None:
    """Clearly visible log for dev/test — read with: docker compose logs core-banking"""
    suffix = f" ({reason})" if reason else ""
    print(f"\n{'='*55}")
    print(f"  VentureRoot OTP [{channel.upper()}]{suffix}")
    print(f"  To   : {target}")
    print(f"  Code : {code}")
    print(f"{'='*55}\n")


def _send_sms_termii(phone: str, code: str) -> bool:
    """Returns True only if a real SMS was actually dispatched via Termii —
    False means it fell back to the dev-log-only path (unconfigured, dev
    mode). Callers that need to know whether delivery is real (e.g.
    send_otp_multi reporting per-channel status) rely on this distinction."""
    if not settings.termii_api_key:
        _dev_log("sms", phone, code, "Termii key not configured")
        if not _is_dev_mode():
            raise RuntimeError("SMS is not configured on this server.")
        return False

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
        return True
    except Exception as exc:
        _dev_log("sms", phone, code, f"Termii error: {exc}")
        if not _is_dev_mode():
            raise
        return False


def _send_sms_infobip(phone: str, code: str) -> bool:
    """Returns True only if a real SMS was actually dispatched via Infobip —
    see _send_sms_termii's docstring for why this distinction matters.

    infobip_base_url is account-specific (shown in the Infobip portal next
    to the API key) — there's no shared default, so an unset base URL is
    treated the same as a missing API key: dev-log fallback in dev, hard
    failure otherwise.
    """
    if not settings.infobip_api_key or not settings.infobip_base_url:
        _dev_log("sms", phone, code, "Infobip key/base URL not configured")
        if not _is_dev_mode():
            raise RuntimeError("SMS is not configured on this server.")
        return False

    try:
        message: dict = {
            "destinations": [{"to": phone}],
            "text": f"Your VentureRoot code is {code}. Valid 10 mins. Do not share.",
        }
        if settings.infobip_sender_id:
            message["from"] = settings.infobip_sender_id

        payload = {"messages": [message]}
        headers = {
            "Authorization": f"App {settings.infobip_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        base = settings.infobip_base_url.rstrip("/")
        with httpx.Client(timeout=10) as client:
            resp = client.post(f"{base}/sms/2/text/advanced", json=payload, headers=headers)
            if not resp.is_success:
                raise RuntimeError(
                    f"Infobip {resp.status_code}: {resp.text[:200]}"
                )
        return True
    except Exception as exc:
        _dev_log("sms", phone, code, f"Infobip error: {exc}")
        if not _is_dev_mode():
            raise
        return False


def _send_sms(phone: str, code: str) -> bool:
    """Dispatches to whichever SMS provider is configured — the single
    place send_otp/send_otp_multi call, so switching providers is a one-line
    settings change (SMS_PROVIDER=termii|infobip) rather than a code change."""
    provider = settings.sms_provider.lower()
    if provider == "infobip":
        return _send_sms_infobip(phone, code)
    if provider == "termii":
        return _send_sms_termii(phone, code)
    _dev_log("sms", phone, code, f"SMS_PROVIDER={settings.sms_provider!r} — no real provider selected")
    if not _is_dev_mode():
        raise RuntimeError("SMS is not configured on this server.")
    return False


# ── Email via SMTP ────────────────────────────────────────────────────────────

_PLACEHOLDER_PASSWORDS = {"your_gmail_app_password_here", "", "changeme", "your_password"}


def _smtp_configured() -> bool:
    return (
        bool(settings.smtp_user)
        and bool(settings.smtp_password)
        and settings.smtp_password.lower() not in _PLACEHOLDER_PASSWORDS
    )


def _send_email_otp(email: str, code: str) -> bool:
    """Returns True only if a real email was actually sent via SMTP — see
    _send_sms_termii's docstring for why this distinction matters."""
    if not _smtp_configured():
        _dev_log("email", email, code, "SMTP not configured")
        if not _is_dev_mode():
            raise RuntimeError("Email delivery is not configured on this server.")
        return False

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
        return True
    except Exception as exc:
        _dev_log("email", email, code, f"SMTP error: {exc}")
        if not _is_dev_mode():
            raise
        return False


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
        _send_sms(target, code)
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


# ── Multi-channel: both SMS and email for every OTP ────────────────────────────

def send_otp_multi(
    db: Session,
    phone: str,
    email: str,
    purpose: str = "phone_verify",
) -> dict[str, dict]:
    """
    Every OTP goes out on both channels at once, sharing one code, so the
    user can verify with whichever actually reached them — SMS delivery
    issues shouldn't block someone who has working email, and vice versa.

    Raises OtpError if the rate limit is hit on either target, or if BOTH
    channels genuinely failed to deliver outside dev mode. In dev mode with
    no credentials configured, both channels legitimately report
    sent=False (console-logged only) without this being treated as failure.
    """
    for target, channel in ((phone, "sms"), (email, "email")):
        recent = _count_recent_sends(db, target, channel)
        if recent >= settings.otp_max_per_window:
            raise OtpError(
                f"Too many OTP requests. Maximum {settings.otp_max_per_window} "
                "per 10 minutes. Please wait before requesting again."
            )

    code = _generate_code()
    code_hash = _hash_code(code)
    expires_at = _now() + timedelta(minutes=settings.otp_expiry_minutes)

    db.add(OtpRecord(target=phone, channel="sms", code_hash=code_hash, purpose=purpose, expires_at=expires_at))
    db.add(OtpRecord(target=email, channel="email", code_hash=code_hash, purpose=purpose, expires_at=expires_at))
    db.commit()

    result = {"sms": {"sent": False, "error": None}, "email": {"sent": False, "error": None}}

    try:
        result["sms"]["sent"] = _send_sms(phone, code)
    except Exception as exc:
        result["sms"]["error"] = str(exc)

    try:
        result["email"]["sent"] = _send_email_otp(email, code)
    except Exception as exc:
        result["email"]["error"] = str(exc)

    if not result["sms"]["sent"] and not result["email"]["sent"] and not _is_dev_mode():
        raise OtpError("Could not send verification code via SMS or email. Please try again shortly.")

    return result


def verify_otp_multi(
    db: Session,
    phone: str,
    email: str,
    code: str,
) -> bool:
    """
    Verifies against whichever channel's record matches — the same code was
    sent to both, so either the SMS or the email record can satisfy this.
    Both records are marked used together on success so the code can't be
    replayed a second time via the other channel.
    """
    records: list[OtpRecord] = list(
        db.execute(
            select(OtpRecord).where(
                OtpRecord.target.in_([phone, email]),
                OtpRecord.is_used == False,  # noqa: E712
                OtpRecord.expires_at > _now(),
            ).order_by(OtpRecord.created_at.desc())
        ).scalars().all()
    )

    if not records:
        raise OtpError("No active OTP found. Please request a new code.")

    active_records = [r for r in records if r.attempts < settings.otp_max_verify_attempts]
    if not active_records:
        for record in records:
            record.is_used = True
        db.commit()
        raise OtpError("Too many failed attempts. Please request a new code.")

    code_hash = _hash_code(code)
    matched = next((r for r in active_records if r.code_hash == code_hash), None)

    if matched is None:
        for record in active_records:
            record.attempts += 1
        db.commit()
        remaining = settings.otp_max_verify_attempts - min(r.attempts for r in active_records)
        raise OtpError(f"Incorrect code. {max(0, remaining)} attempt(s) remaining.")

    for record in records:
        if record.code_hash == code_hash:
            record.is_used = True
    db.commit()
    return True

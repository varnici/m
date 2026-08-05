"""
Guards against the OTP silent-failure bug: an unconfigured delivery channel
(placeholder SMTP password / missing Termii key) must raise in non-dev
environments instead of silently no-op'ing while the API reports success.
Dev mode keeps working via console-logged codes (intentional, for local work
without real credentials).
"""
from app.core.config import settings
from app.services.otp_service import _send_email_otp, _send_sms_termii


def test_email_otp_raises_when_unconfigured_outside_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_password", "your_gmail_app_password_here")
    try:
        _send_email_otp("someone@example.com", "123456")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "not configured" in str(exc)


def test_email_otp_silently_logs_when_unconfigured_in_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_password", "")
    _send_email_otp("someone@example.com", "123456")  # must not raise


def test_sms_otp_raises_when_unconfigured_outside_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "termii_api_key", "")
    try:
        _send_sms_termii("+2348012345678", "123456")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "not configured" in str(exc)


def test_sms_otp_silently_logs_when_unconfigured_in_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    monkeypatch.setattr(settings, "termii_api_key", "")
    _send_sms_termii("+2348012345678", "123456")  # must not raise

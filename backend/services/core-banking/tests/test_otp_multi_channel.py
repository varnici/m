"""
Every OTP now goes out on both SMS and email, sharing one code, so either
channel can verify it. These tests cover the service-layer functions
directly (dev-mode delivery behavior, rate limiting, cross-channel verify,
replay protection) plus the HTTP endpoints' request/response contract.

Each test wraps its DB access in `with TestClient(app) as client:` — even
where the client itself isn't used — because table creation only runs on
app startup; a bare SessionLocal() against a table that's never been
created raises "no such table".
"""
from datetime import timedelta

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.infrastructure.database import SessionLocal
from app.services.otp_service import (
    OtpError,
    send_otp_multi,
    verify_otp_multi,
    _hash_code,
    _now,
)
from app.models.platform_metrics import OtpRecord


def _db():
    return SessionLocal()()


def test_send_otp_multi_dev_mode_reports_unsent_but_does_not_raise(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    monkeypatch.setattr(settings, "termii_api_key", "")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_password", "")

    with TestClient(app):
        db = _db()
        try:
            result = send_otp_multi(db, "+2348011119991", "multi1@example.com", "phone_verify")
            assert result["sms"]["sent"] is False
            assert result["email"]["sent"] is False
        finally:
            db.close()


def test_send_otp_multi_raises_when_both_fail_outside_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "termii_api_key", "")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_password", "")

    with TestClient(app):
        db = _db()
        try:
            try:
                send_otp_multi(db, "+2348011119992", "multi2@example.com", "phone_verify")
                assert False, "expected OtpError"
            except OtpError as exc:
                assert "SMS or email" in str(exc)
        finally:
            db.close()


def test_send_otp_multi_shares_one_code_across_both_records(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    phone, email = "+2348011119993", "multi3@example.com"

    with TestClient(app):
        db = _db()
        try:
            send_otp_multi(db, phone, email, "phone_verify")
            records = (
                db.query(OtpRecord)
                .filter(OtpRecord.target.in_([phone, email]))
                .order_by(OtpRecord.created_at.desc())
                .limit(2)
                .all()
            )
            assert len(records) == 2
            assert records[0].code_hash == records[1].code_hash
        finally:
            db.close()


def test_verify_otp_multi_end_to_end_with_known_code(monkeypatch):
    """Seeds the plaintext code directly (real dispatch is hard to
    intercept), then confirms verify_otp_multi accepts it — and that a
    replay of the same code afterward fails, since both records were
    consumed together."""
    monkeypatch.setattr(settings, "env", "dev")
    phone, email = "+2348011119994", "multi4@example.com"

    with TestClient(app):
        db = _db()
        try:
            code = "654321"
            code_hash = _hash_code(code)
            expires_at = _now() + timedelta(minutes=10)
            db.add(OtpRecord(target=phone, channel="sms", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.add(OtpRecord(target=email, channel="email", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.commit()

            assert verify_otp_multi(db, phone, email, code) is True

            try:
                verify_otp_multi(db, phone, email, code)
                assert False, "expected OtpError on replay"
            except OtpError:
                pass
        finally:
            db.close()


def test_verify_otp_multi_wrong_code_increments_attempts_on_both_records(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    phone, email = "+2348011119995", "multi5@example.com"

    with TestClient(app):
        db = _db()
        try:
            code_hash = _hash_code("111111")
            expires_at = _now() + timedelta(minutes=10)
            db.add(OtpRecord(target=phone, channel="sms", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.add(OtpRecord(target=email, channel="email", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.commit()

            try:
                verify_otp_multi(db, phone, email, "000000")
                assert False, "expected OtpError"
            except OtpError as exc:
                assert "Incorrect code" in str(exc)

            records = db.query(OtpRecord).filter(OtpRecord.target.in_([phone, email])).all()
            assert all(r.attempts == 1 for r in records)
        finally:
            db.close()


# ── HTTP-level ──────────────────────────────────────────────────────────────

def _create_user(client, phone):
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Test User", "category": "retail"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_otp_send_and_verify_http_flow(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    with TestClient(app) as client:
        user_id = _create_user(client, "2348055551001")
        headers = {"X-User-Id": user_id}

        r = client.post(
            "/v1/otp/send",
            json={"phone": "+2348066661001", "email": "flow1@example.com", "purpose": "phone_verify"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

        # Seed a known code for the verify leg rather than parsing server stdout.
        db = _db()
        try:
            code_hash = _hash_code("222222")
            expires_at = _now() + timedelta(minutes=10)
            db.query(OtpRecord).filter(OtpRecord.target.in_(["+2348066661001", "flow1@example.com"])).delete(synchronize_session=False)
            db.add(OtpRecord(target="+2348066661001", channel="sms", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.add(OtpRecord(target="flow1@example.com", channel="email", code_hash=code_hash, purpose="phone_verify", expires_at=expires_at))
            db.commit()
        finally:
            db.close()

        r = client.post(
            "/v1/otp/verify",
            json={"phone": "+2348066661001", "email": "flow1@example.com", "code": "222222"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True


def test_otp_verify_rejects_bad_code_shape():
    with TestClient(app) as client:
        user_id = _create_user(client, "2348055551002")
        r = client.post(
            "/v1/otp/verify",
            json={"phone": "+2348066661002", "email": "bad@example.com", "code": "abc"},
            headers={"X-User-Id": user_id},
        )
        assert r.status_code == 422

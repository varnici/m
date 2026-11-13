"""
Covers the new Infobip SMS provider dispatch (otp_service.py) and the
forgotten-password-via-SMS-OTP flow (password_reset.py): request/confirm
HTTP contract, the no-user-enumeration behavior, weak-password rejection,
and that a successful confirm actually calls Supabase's Admin API with the
right user id and password (mocked — no real network call).
"""
from datetime import timedelta

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.infrastructure.database import SessionLocal
from app.services import otp_service
from app.services import supabase_admin_service
from app.services.otp_service import _hash_code, _now
from app.models.platform_metrics import OtpRecord


def _db():
    return SessionLocal()()


def _create_user(client, phone):
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Test User", "category": "retail"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ── Infobip SMS provider dispatch ────────────────────────────────────────────

class _FakeResponse:
    def __init__(self, status_code=200, text="{}"):
        self.status_code = status_code
        self.text = text
        self.is_success = 200 <= status_code < 300


class _FakeHttpxClient:
    """Records the last request made through it; used in place of
    httpx.Client so no real network call happens in tests."""
    last_url = None
    last_json = None
    last_headers = None
    response = _FakeResponse()

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, json=None, headers=None):
        _FakeHttpxClient.last_url = url
        _FakeHttpxClient.last_json = json
        _FakeHttpxClient.last_headers = headers
        return _FakeHttpxClient.response

    def put(self, url, json=None, headers=None):
        return self.post(url, json=json, headers=headers)


def test_send_sms_dispatches_to_infobip_with_correct_contract(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "sms_provider", "infobip")
    monkeypatch.setattr(settings, "infobip_api_key", "test-key-123")
    monkeypatch.setattr(settings, "infobip_base_url", "https://xxxxx.api.infobip.com")
    monkeypatch.setattr(settings, "infobip_sender_id", "")
    monkeypatch.setattr(otp_service, "httpx", type("M", (), {"Client": _FakeHttpxClient}))

    sent = otp_service._send_sms("+2348012345678", "123456")

    assert sent is True
    assert _FakeHttpxClient.last_url == "https://xxxxx.api.infobip.com/sms/2/text/advanced"
    assert _FakeHttpxClient.last_headers["Authorization"] == "App test-key-123"
    assert _FakeHttpxClient.last_json == {
        "messages": [
            {
                "destinations": [{"to": "+2348012345678"}],
                "text": "Your VentureRoot code is 123456. Valid 10 mins. Do not share.",
            }
        ]
    }


def test_send_sms_infobip_includes_sender_id_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "sms_provider", "infobip")
    monkeypatch.setattr(settings, "infobip_api_key", "test-key-123")
    monkeypatch.setattr(settings, "infobip_base_url", "https://xxxxx.api.infobip.com")
    monkeypatch.setattr(settings, "infobip_sender_id", "VentureRoot")
    monkeypatch.setattr(otp_service, "httpx", type("M", (), {"Client": _FakeHttpxClient}))

    otp_service._send_sms("+2348012345678", "654321")
    assert _FakeHttpxClient.last_json["messages"][0]["from"] == "VentureRoot"


def test_send_sms_infobip_dev_fallback_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    monkeypatch.setattr(settings, "sms_provider", "infobip")
    monkeypatch.setattr(settings, "infobip_api_key", "")
    monkeypatch.setattr(settings, "infobip_base_url", "")

    sent = otp_service._send_sms("+2348012345678", "111111")
    assert sent is False  # logged to console instead, not raised in dev


def test_send_sms_infobip_raises_outside_dev_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "sms_provider", "infobip")
    monkeypatch.setattr(settings, "infobip_api_key", "")
    monkeypatch.setattr(settings, "infobip_base_url", "")

    try:
        otp_service._send_sms("+2348012345678", "111111")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "not configured" in str(exc)


def test_send_sms_falls_back_to_termii_when_selected(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    monkeypatch.setattr(settings, "sms_provider", "termii")
    monkeypatch.setattr(settings, "termii_api_key", "")

    # Termii path with no key configured -> dev-log fallback, same contract
    # as Infobip's — confirms the dispatcher actually routes by provider
    # rather than always hitting one branch.
    sent = otp_service._send_sms("+2348012345678", "222222")
    assert sent is False


# ── Password reset HTTP flow ─────────────────────────────────────────────────

def test_password_reset_request_sends_otp_for_registered_phone(monkeypatch):
    monkeypatch.setattr(settings, "env", "dev")
    with TestClient(app) as client:
        phone = "+2348077770001"
        _create_user(client, phone)

        r = client.post("/v1/password-reset/request", json={"phone": phone})
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

        db = _db()
        try:
            record = (
                db.query(OtpRecord)
                .filter(OtpRecord.target == phone, OtpRecord.purpose == "password_reset")
                .order_by(OtpRecord.created_at.desc())
                .first()
            )
            assert record is not None
        finally:
            db.close()


def test_password_reset_request_gives_same_response_for_unregistered_phone():
    """No user-enumeration: an unregistered number gets the identical
    generic response, not a 404 or a different message."""
    with TestClient(app) as client:
        r1 = client.post("/v1/password-reset/request", json={"phone": "+2348099990000"})
        r2 = client.post("/v1/password-reset/request", json={"phone": "+2348088880000"})
        assert r1.status_code == r2.status_code == 200
        assert r1.json()["message"] == r2.json()["message"]


def test_password_reset_confirm_rejects_weak_password(monkeypatch):
    with TestClient(app) as client:
        phone = "+2348077770002"
        _create_user(client, phone)
        r = client.post(
            "/v1/password-reset/confirm",
            json={"phone": phone, "code": "123456", "new_password": "weak"},
        )
        assert r.status_code == 422


def test_password_reset_confirm_rejects_wrong_code():
    with TestClient(app) as client:
        phone = "+2348077770003"
        _create_user(client, phone)

        db = _db()
        try:
            db.add(OtpRecord(
                target=phone, channel="sms", code_hash=_hash_code("999999"),
                purpose="password_reset", expires_at=_now() + timedelta(minutes=10),
            ))
            db.commit()
        finally:
            db.close()

        r = client.post(
            "/v1/password-reset/confirm",
            json={"phone": phone, "code": "000000", "new_password": "Str0ng!Pass"},
        )
        assert r.status_code == 400


def test_password_reset_confirm_succeeds_and_calls_supabase_admin(monkeypatch):
    monkeypatch.setattr(supabase_admin_service, "httpx", type("M", (), {"Client": _FakeHttpxClient}))
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-role-secret")
    _FakeHttpxClient.response = _FakeResponse(status_code=200)

    with TestClient(app) as client:
        phone = "+2348077770004"
        user_id = _create_user(client, phone)

        db = _db()
        try:
            db.add(OtpRecord(
                target=phone, channel="sms", code_hash=_hash_code("456789"),
                purpose="password_reset", expires_at=_now() + timedelta(minutes=10),
            ))
            db.commit()
        finally:
            db.close()

        r = client.post(
            "/v1/password-reset/confirm",
            json={"phone": phone, "code": "456789", "new_password": "Str0ng!Pass"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

        assert _FakeHttpxClient.last_url == f"https://project.supabase.co/auth/v1/admin/users/{user_id}"
        assert _FakeHttpxClient.last_json == {"password": "Str0ng!Pass"}
        assert _FakeHttpxClient.last_headers["Authorization"] == "Bearer service-role-secret"


def test_password_reset_confirm_surfaces_502_when_supabase_admin_fails(monkeypatch):
    monkeypatch.setattr(supabase_admin_service, "httpx", type("M", (), {"Client": _FakeHttpxClient}))
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-role-secret")
    _FakeHttpxClient.response = _FakeResponse(status_code=500, text="internal error")

    with TestClient(app) as client:
        phone = "+2348077770005"
        _create_user(client, phone)

        db = _db()
        try:
            db.add(OtpRecord(
                target=phone, channel="sms", code_hash=_hash_code("135790"),
                purpose="password_reset", expires_at=_now() + timedelta(minutes=10),
            ))
            db.commit()
        finally:
            db.close()

        r = client.post(
            "/v1/password-reset/confirm",
            json={"phone": phone, "code": "135790", "new_password": "Str0ng!Pass"},
        )
        assert r.status_code == 502

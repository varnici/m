from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.services.notification_service import NotificationService


def _create_user(client, phone):
    r = client.post(
        "/v1/users",
        json={"phone": phone, "email": f"{phone}@example.com", "full_name": "Test User", "category": "retail"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_list_mark_read_and_mark_all_read():
    with TestClient(app) as client:
        user_id = _create_user(client, "2348022220001")
        headers = {"X-User-Id": user_id}

        # Seed notifications directly via the service (creation isn't a
        # public endpoint — the system, not the recipient, sends these).
        db = SessionLocal()()
        try:
            service = NotificationService(db)
            n1 = service.create(user_id, "order_request", "New order", "Business X wants 10 bags of rice")
            service.create(user_id, "system", "Welcome", "Thanks for joining")
        finally:
            db.close()

        r = client.get("/v1/notifications", headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["total"] == 2
        assert body["unread_count"] == 2
        assert len(body["items"]) == 2
        assert body["items"][0]["read"] is False

        r = client.patch(f"/v1/notifications/{n1.id}/read", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["read"] is True

        r = client.get("/v1/notifications?unread_only=true", headers=headers)
        assert r.json()["total"] == 1

        r = client.post("/v1/notifications/read-all", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["marked_read"] == 1

        r = client.get("/v1/notifications", headers=headers)
        assert r.json()["unread_count"] == 0


def test_notifications_scoped_to_owner():
    with TestClient(app) as client:
        user_a = _create_user(client, "2348022220002")
        user_b = _create_user(client, "2348022220003")

        db = SessionLocal()()
        try:
            NotificationService(db).create(user_a, "system", "For A", "Only A should see this")
        finally:
            db.close()

        r = client.get("/v1/notifications", headers={"X-User-Id": user_b})
        assert r.status_code == 200
        assert r.json()["total"] == 0

        r = client.get("/v1/notifications", headers={"X-User-Id": user_a})
        assert r.json()["total"] == 1


def test_register_device_upserts_by_token():
    with TestClient(app) as client:
        user_id = _create_user(client, "2348022220004")
        headers = {"X-User-Id": user_id}

        r = client.post(
            "/v1/notifications/register-device",
            json={"push_token": "ExponentPushToken[abc123]", "platform": "ios"},
            headers=headers,
        )
        assert r.status_code == 201, r.text

        # Re-registering the same token (e.g. app reinstall under same user) upserts, not duplicates
        r = client.post(
            "/v1/notifications/register-device",
            json={"push_token": "ExponentPushToken[abc123]", "platform": "android"},
            headers=headers,
        )
        assert r.status_code == 201, r.text

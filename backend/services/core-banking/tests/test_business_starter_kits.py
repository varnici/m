"""HTTP-level coverage for the business-starter-kit catalog and for
creating a Budget Best savings goal against one — the "pay for a business
idea over a defined period" feature for nine_to_five users. Exercises
router registration and response_model serialization of the nested
starter_kit, which the service-level tests in test_savings.py don't touch.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.models.user import User
from app.models.wallet import Wallet
from app.models.business_starter_kit import BusinessStarterKit


def _db():
    return SessionLocal()()


def _seed_user_and_kit(phone):
    db = _db()
    try:
        user = User(phone=phone, full_name="Kit Test User", category="nine_to_five")
        db.add(user)
        db.flush()
        db.add(Wallet(user_id=user.id, balance_kobo=5_000_000))
        kit = BusinessStarterKit(
            slug=f"test-kit-{phone[-4:]}", name="Test Provision Store Kit",
            description="Everything for a test store.", business_category="retail",
            icon_name="Store", total_cost_kobo=100000, suggested_duration_months=6,
            items=[{"name": "Shelving", "quantity": 1, "estimated_cost_kobo": 100000}],
        )
        db.add(kit)
        db.commit()
        db.refresh(user)
        db.refresh(kit)
        return user.id, kit.id
    finally:
        db.close()


def test_list_and_get_starter_kits(monkeypatch):
    from app.infrastructure import auth as auth_module

    user_id, kit_id = _seed_user_and_kit("+2348055550001")
    monkeypatch.setattr(auth_module, "get_current_user_id", lambda: user_id)
    app.dependency_overrides[auth_module.get_current_user_id] = lambda: user_id

    with TestClient(app) as client:
        r = client.get("/v1/business-starter-kits")
        assert r.status_code == 200, r.text
        slugs = [k["slug"] for k in r.json()]
        assert f"test-kit-0001" in slugs

        r2 = client.get(f"/v1/business-starter-kits/{kit_id}")
        assert r2.status_code == 200, r2.text
        assert r2.json()["name"] == "Test Provision Store Kit"
        assert r2.json()["items"][0]["name"] == "Shelving"

    app.dependency_overrides.pop(auth_module.get_current_user_id, None)


def test_get_unknown_kit_404s(monkeypatch):
    from app.infrastructure import auth as auth_module

    user_id, _ = _seed_user_and_kit("+2348055550002")
    app.dependency_overrides[auth_module.get_current_user_id] = lambda: user_id

    with TestClient(app) as client:
        r = client.get("/v1/business-starter-kits/does-not-exist")
        assert r.status_code == 404

    app.dependency_overrides.pop(auth_module.get_current_user_id, None)


def test_create_goal_via_http_with_starter_kit(monkeypatch):
    from app.infrastructure import auth as auth_module

    user_id, kit_id = _seed_user_and_kit("+2348055550003")
    app.dependency_overrides[auth_module.get_current_user_id] = lambda: user_id

    with TestClient(app) as client:
        r = client.post(
            "/v1/budget-best/goals",
            json={
                "title": "My Provision Store",
                "category": "business_starter",
                "target_amount_kobo": 100000,
                "starter_kit_id": kit_id,
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["starter_kit_id"] == kit_id
        assert body["starter_kit"]["name"] == "Test Provision Store Kit"

    app.dependency_overrides.pop(auth_module.get_current_user_id, None)

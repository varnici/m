from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.models.onboarding import DistributorProfile


def _create_user(client, phone, category="retail", business_name=None):
    r = client.post(
        "/v1/users",
        json={
            "phone": phone,
            "email": f"{phone}@example.com",
            "full_name": "Test User",
            "category": category,
            **({"business_name": business_name} if business_name else {}),
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_get_my_distributor_profile_404_when_none():
    with TestClient(app) as client:
        user_id = _create_user(client, "2348033330001", category="distributor")
        r = client.get("/v1/distributors/me", headers={"X-User-Id": user_id})
        assert r.status_code == 404


def test_get_my_distributor_profile_returns_seeded_profile():
    with TestClient(app) as client:
        user_id = _create_user(client, "2348033330002", category="distributor")

        db = SessionLocal()()
        try:
            db.add(DistributorProfile(user_id=user_id, company_name="Lagos Wholesale Ltd", verified=True))
            db.commit()
        finally:
            db.close()

        r = client.get("/v1/distributors/me", headers={"X-User-Id": user_id})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["company_name"] == "Lagos Wholesale Ltd"
        assert body["verified"] is True


def test_list_distributors_defaults_to_verified_only():
    with TestClient(app) as client:
        buyer_id = _create_user(client, "2348033330005", category="retail")

        # Other tests in this file (sharing the in-memory DB) may already have
        # seeded distributor rows — assert the delta this test introduces, not
        # an absolute count.
        baseline_verified = client.get("/v1/distributors", headers={"X-User-Id": buyer_id}).json()["total"]
        baseline_all = client.get("/v1/distributors?verified_only=false", headers={"X-User-Id": buyer_id}).json()["total"]

        verified_id = _create_user(client, "2348033330003", category="distributor", business_name="Verified Distro")
        unverified_id = _create_user(client, "2348033330004", category="distributor", business_name="Unverified Distro")

        db = SessionLocal()()
        try:
            db.add(DistributorProfile(user_id=verified_id, company_name="Verified Distro Co", verified=True))
            db.add(DistributorProfile(user_id=unverified_id, company_name="Unverified Distro Co", verified=False))
            db.commit()
        finally:
            db.close()

        r = client.get("/v1/distributors", headers={"X-User-Id": buyer_id})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["total"] == baseline_verified + 1
        assert any(item["company_name"] == "Verified Distro Co" for item in body["items"])
        assert not any(item["company_name"] == "Unverified Distro Co" for item in body["items"])

        r = client.get("/v1/distributors?verified_only=false", headers={"X-User-Id": buyer_id})
        assert r.json()["total"] == baseline_all + 2

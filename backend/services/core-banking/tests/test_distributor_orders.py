from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database import SessionLocal
from app.models.onboarding import DistributorProfile
from app.models.savings import SavingsGoal, SavingsStreak


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


def _seed_distributor(client, distributor_id, verified=True):
    db = SessionLocal()()
    try:
        db.add(DistributorProfile(user_id=distributor_id, company_name="Lagos Wholesale Ltd", verified=verified))
        db.commit()
    finally:
        db.close()

    r = client.post(
        "/v1/inventory/stores",
        json={"name": "Main Warehouse", "type": "warehouse", "address": "1 Depot Rd", "city": "Lagos", "state": "Lagos", "is_primary": True},
        headers={"X-User-Id": distributor_id},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _seed_wholesale_product(client, distributor_id, store_id, name="Rice 50kg", price_kobo=8_000_000):
    r = client.post(
        "/v1/inventory/products",
        json={
            "name": name,
            "sku": f"SKU-{name.replace(' ', '-')}",
            "cost_price_kobo": price_kobo - 500_000,
            "selling_price_kobo": price_kobo,
            "trade_price_kobo": price_kobo,
            "is_wholesale_listed": True,
            "quantity_on_hand": 100,
            "store_id": store_id,
        },
        headers={"X-User-Id": distributor_id},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _give_buyer_trade_credit(buyer_id, saved_kobo=50_000_000, streak=40):
    """Trade credit is earned from savings + sales trust, not granted directly —
    seed the underlying signals so the buyer has real available credit."""
    db = SessionLocal()()
    try:
        db.add(SavingsGoal(user_id=buyer_id, target_amount_kobo=saved_kobo, current_total_kobo=saved_kobo, title="Restock fund"))
        db.add(SavingsStreak(user_id=buyer_id, streak_count=streak))
        db.commit()
    finally:
        db.close()


def test_wholesale_catalog_only_shows_listed_products():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348044440001", category="distributor")
        store_id = _seed_distributor(client, distributor_id)
        listed = _seed_wholesale_product(client, distributor_id, store_id, "Listed Rice")

        # A private (non-wholesale) product on the same distributor must NOT appear
        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Private Stock Item",
                "sku": "SKU-PRIVATE",
                "cost_price_kobo": 1000,
                "selling_price_kobo": 2000,
                "quantity_on_hand": 10,
                "store_id": store_id,
            },
            headers={"X-User-Id": distributor_id},
        )
        assert r.status_code == 201, r.text

        buyer_id = _create_user(client, "2348044440002", category="retail")
        r = client.get(f"/v1/distributors/{distributor_id}/products", headers={"X-User-Id": buyer_id})
        assert r.status_code == 200, r.text
        names = [p["name"] for p in r.json()]
        assert "Listed Rice" in names
        assert "Private Stock Item" not in names


def test_order_rejected_when_exceeds_trade_credit():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348044440003", category="distributor")
        store_id = _seed_distributor(client, distributor_id)
        product = _seed_wholesale_product(client, distributor_id, store_id, "Expensive Rice", price_kobo=50_000_000)

        buyer_id = _create_user(client, "2348044440004", category="retail")
        # No savings/sales seeded — trade credit limit is effectively zero.

        r = client.post(
            f"/v1/distributors/{distributor_id}/orders",
            json={"lines": [{"product_id": product["id"], "quantity": 1, "unit_price_kobo": 50_000_000}]},
            headers={"X-User-Id": buyer_id},
        )
        assert r.status_code == 422, r.text
        assert "trade credit" in r.text.lower()


def test_order_within_credit_succeeds_and_notifies_distributor():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348044440005", category="distributor", business_name="Lagos Wholesale")
        store_id = _seed_distributor(client, distributor_id)
        product = _seed_wholesale_product(client, distributor_id, store_id, "Affordable Rice", price_kobo=1_000_000)

        buyer_id = _create_user(client, "2348044440006", category="retail", business_name="Ada's Store")
        _give_buyer_trade_credit(buyer_id, saved_kobo=100_000_000, streak=40)

        r = client.post(
            f"/v1/distributors/{distributor_id}/orders",
            json={"lines": [{"product_id": product["id"], "quantity": 2, "unit_price_kobo": 1_000_000}]},
            headers={"X-User-Id": buyer_id},
        )
        assert r.status_code == 201, r.text
        order = r.json()
        assert order["status"] == "draft"
        assert order["total_kobo"] == 2_000_000

        # Distributor should have a real notification with line-item detail
        r = client.get("/v1/notifications", headers={"X-User-Id": distributor_id})
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert any(n["type"] == "order_request" and n["related_entity_id"] == order["id"] for n in items)
        notif = next(n for n in items if n["related_entity_id"] == order["id"])
        assert notif["notification_metadata"]["total_kobo"] == 2_000_000
        assert "Ada's Store" in notif["title"]


def test_cannot_order_from_own_catalog():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348044440007", category="distributor")
        store_id = _seed_distributor(client, distributor_id)
        product = _seed_wholesale_product(client, distributor_id, store_id, "Self Order Rice")

        r = client.post(
            f"/v1/distributors/{distributor_id}/orders",
            json={"lines": [{"product_id": product["id"], "quantity": 1, "unit_price_kobo": 8_000_000}]},
            headers={"X-User-Id": distributor_id},
        )
        assert r.status_code == 400


def test_trade_credit_endpoint_reflects_in_use_after_order():
    with TestClient(app) as client:
        distributor_id = _create_user(client, "2348044440008", category="distributor")
        store_id = _seed_distributor(client, distributor_id)
        product = _seed_wholesale_product(client, distributor_id, store_id, "Credit Tracked Rice", price_kobo=1_000_000)

        buyer_id = _create_user(client, "2348044440009", category="retail")
        _give_buyer_trade_credit(buyer_id, saved_kobo=100_000_000, streak=40)

        r = client.get("/v1/distributors/trade-credit", headers={"X-User-Id": buyer_id})
        assert r.status_code == 200, r.text
        before = r.json()
        assert before["trade_credit_in_use_kobo"] == 0

        r = client.post(
            f"/v1/distributors/{distributor_id}/orders",
            json={"lines": [{"product_id": product["id"], "quantity": 3, "unit_price_kobo": 1_000_000}]},
            headers={"X-User-Id": buyer_id},
        )
        assert r.status_code == 201, r.text

        r = client.get("/v1/distributors/trade-credit", headers={"X-User-Id": buyer_id})
        after = r.json()
        assert after["trade_credit_in_use_kobo"] == 3_000_000
        assert after["trade_credit_available_kobo"] == before["trade_credit_available_kobo"] - 3_000_000

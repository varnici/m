from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.main import app


def _create_user(client: TestClient, phone: str, category: str = "business_owner") -> dict:
    r = client.post(
        "/v1/users",
        json={
            "phone": phone,
            "email": f"{phone}@example.com",
            "full_name": f"User {phone[-4:]}",
            "category": category,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_marketplace_product_listing_and_nearby_discovery():
    with TestClient(app) as client:
        seller = _create_user(client, "2348000000101", category="business_owner")

        product_resp = client.post(
            f"/v1/marketplace/products?owner_id={seller['id']}",
            json={
                "name": "Cooking Oil 1L",
                "description": "Premium vegetable oil",
                "sku": "SKU-COOKING-OIL-1L",
                "category": "fmcg",
                "unit_price_kobo": 250000,
                "estate": "Lekki Phase 1",
                "city": "Lagos",
            },
        )
        assert product_resp.status_code == 200, product_resp.text
        product = product_resp.json()

        listing_resp = client.post(
            "/v1/marketplace/listings",
            json={
                "product_id": product["id"],
                "price_kobo": 245000,
                "available_quantity": 30,
            },
        )
        assert listing_resp.status_code == 200, listing_resp.text
        listing = listing_resp.json()

        nearby = client.get("/v1/marketplace/listings/nearby?estate=Lekki Phase 1")
        assert nearby.status_code == 200, nearby.text
        assert any(item["id"] == listing["id"] for item in nearby.json())

        shopfront = client.get(f"/v1/marketplace/shopfront/{listing['slug']}")
        assert shopfront.status_code == 200, shopfront.text
        assert shopfront.json()["id"] == listing["id"]


def test_artisan_register_book_and_rate():
    with TestClient(app) as client:
        artisan_user = _create_user(client, "2348000000102", category="business_owner")
        client_user = _create_user(client, "2348000000103", category="personal")

        artisan_resp = client.post(
            "/v1/artisans",
            json={
                "user_id": artisan_user["id"],
                "trade_category": "plumbing",
                "years_experience": 5,
                "service_area": "Lekki",
                "estate": "Lekki Phase 1",
                "city": "Lagos",
            },
        )
        assert artisan_resp.status_code == 200, artisan_resp.text
        artisan = artisan_resp.json()

        list_resp = client.get("/v1/artisans?trade_category=plumbing&estate=Lekki Phase 1")
        assert list_resp.status_code == 200, list_resp.text
        assert any(a["id"] == artisan["id"] for a in list_resp.json())

        booking_resp = client.post(
            "/v1/artisans/bookings",
            json={
                "artisan_id": artisan["id"],
                "client_user_id": client_user["id"],
                "service_category": "plumbing",
                "problem_description": "Leaking kitchen sink",
                "address": "10 Example Street, Lekki",
                "scheduled_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            },
        )
        assert booking_resp.status_code == 200, booking_resp.text
        booking = booking_resp.json()

        # mark booking complete directly through API patchless flow currently absent;
        # in current MVP, force by creating a second request to list and then rating cannot proceed
        # unless status is completed, so this verifies guard works.
        bad_rating = client.post(
            "/v1/artisans/ratings",
            json={
                "booking_id": booking["id"],
                "goods_condition_ok": True,
                "on_time": "yes",
                "communication_ok": True,
                "correct_address": True,
            },
        )
        assert bad_rating.status_code == 400


from fastapi.testclient import TestClient

from app.main import app


def test_user_create_sale_and_loan_flow():
    with TestClient(app) as client:
        # create user
        r = client.post(
            "/v1/users",
            json={"phone": "2348000000000", "email": "a@example.com", "full_name": "A User", "category": "business_owner"},
        )
        assert r.status_code == 200, r.text
        user = r.json()
        user_id = user["id"]

        # wallet exists
        r = client.get(f"/v1/wallet/{user_id}")
        assert r.status_code == 200

        # record sale
        r = client.post(
            "/v1/sales",
            json={"user_id": user_id, "product_sku": "SKU-COOKING-OIL-1L", "quantity": 2, "unit_price_kobo": 250000, "channel": "manual"},
        )
        assert r.status_code == 200, r.text

        # create loan
        r = client.post(
            "/v1/loans",
            json={"user_id": user_id, "product_sku": "SKU-COOKING-OIL-1L", "product_qty": 10, "principal_kobo": 1_000_000},
        )
        assert r.status_code == 200, r.text
        loan = r.json()
        assert loan["status"] == "active"

        # repay loan
        r = client.post(f"/v1/loans/{loan['id']}/repay", json={"amount_kobo": loan["total_due_kobo"]})
        assert r.status_code == 200, r.text


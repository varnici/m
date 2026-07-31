"""HTTP-level coverage for the mockup gap-fill: category icon/tint + CRUD,
product size/imei/expiry_date/business_type round-trips, and the
stock/transfer bugfix (StockService.transfer_stock was called but never
defined — this previously 500'd every time)."""

from fastapi.testclient import TestClient
from app.main import app


def _create_user(client: TestClient, phone: str) -> dict:
    r = client.post(
        "/v1/users",
        json={
            "phone": phone,
            "email": f"{phone}@example.com",
            "full_name": "Test Owner",
            "category": "retail",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_product_create_and_update_round_trips_new_attrs():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110001")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Amoxil 500mg",
                "sku": "SKU-AMOXIL-500",
                "cost_price_kobo": 120000,
                "selling_price_kobo": 180000,
                "nafdac_number": "A4-1234",
                "expiry_date": "2026-12-31",
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        product = r.json()
        assert product["nafdac_number"] == "A4-1234"
        assert product["expiry_date"] == "2026-12-31"
        product_id = product["id"]

        r = client.put(
            f"/v1/inventory/products/{product_id}",
            json={"size": "L", "imei": "356938035643809", "unit_of_measure": "card"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["size"] == "L"
        assert updated["imei"] == "356938035643809"
        assert updated["unit_of_measure"] == "card"


def test_store_business_type_round_trip():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110002")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={
                "name": "Main Pharmacy",
                "address": "1 Market Rd",
                "city": "Lagos",
                "state": "Lagos",
                "business_type": "pharmacy",
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        store = r.json()
        assert store["business_type"] == "pharmacy"

        r = client.put(
            f"/v1/inventory/stores/{store['id']}",
            json={
                "name": store["name"],
                "address": store["address"],
                "city": store["city"],
                "state": store["state"],
                "business_type": "boutique",
            },
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["business_type"] == "boutique"


def test_category_crud_and_bulk_create():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110003")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/categories",
            json={"name": "Beverages", "slug": "beverages", "icon": "Droplet", "tint": "#2E6E9E"},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        category = r.json()
        assert category["icon"] == "Droplet"
        assert category["tint"] == "#2E6E9E"
        category_id = category["id"]

        r = client.patch(
            f"/v1/inventory/categories/{category_id}",
            json={"icon": "Coffee", "tint": "#7A5AA8"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        patched = r.json()
        assert patched["icon"] == "Coffee"
        assert patched["tint"] == "#7A5AA8"

        r = client.post(
            "/v1/inventory/categories/bulk",
            json={
                "categories": [
                    {"name": "Dairy", "icon": "Coffee", "tint": "#7A5AA8"},
                    {"name": "Grains", "icon": "Wheat", "tint": "#8A6A2F"},
                ]
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        bulk = r.json()
        assert len(bulk) == 2
        assert {c["name"] for c in bulk} == {"Dairy", "Grains"}

        r = client.get("/v1/inventory/categories", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) == 3

        r = client.delete(f"/v1/inventory/categories/{category_id}", headers=headers)
        assert r.status_code == 204, r.text

        r = client.get("/v1/inventory/categories", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) == 2


def test_category_delete_missing_returns_404_not_500():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110004")
        headers = {"X-User-Id": user["id"]}

        r = client.delete("/v1/inventory/categories/does-not-exist", headers=headers)
        assert r.status_code == 404, r.text


def test_stock_transfer_between_stores_no_longer_500s():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110005")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Store A", "address": "1 A Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        store_a = r.json()["id"]

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Store B", "address": "1 B Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        store_b = r.json()["id"]

        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Transfer Test Product",
                "sku": "SKU-TRANSFER-1",
                "cost_price_kobo": 1000,
                "selling_price_kobo": 1500,
                "quantity_on_hand": 50,
                "store_id": store_a,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        product_id = r.json()["id"]

        # This is the endpoint that previously 500'd: InventoryServiceV2.transfer_stock
        # called self.stock.transfer_stock(...), which didn't exist on StockService.
        r = client.post(
            "/v1/inventory/stock/transfer",
            json={
                "from_store_id": store_a,
                "to_store_id": store_b,
                "product_id": product_id,
                "quantity": 20,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        movement = r.json()
        assert movement["movement_type"] == "transfer"
        assert movement["quantity"] == 20

        r = client.get(f"/v1/inventory/stock?store_id={store_b}", headers=headers)
        assert r.status_code == 200, r.text
        levels = [lvl for lvl in r.json() if lvl["product_id"] == product_id]
        assert levels and levels[0]["quantity_on_hand"] == 20

        r = client.get(f"/v1/inventory/stock?store_id={store_a}", headers=headers)
        assert r.status_code == 200, r.text
        levels = [lvl for lvl in r.json() if lvl["product_id"] == product_id]
        assert levels and levels[0]["quantity_on_hand"] == 30


def test_daily_report_reflects_receive_and_issue_movements():
    import datetime as dt

    with TestClient(app) as client:
        user = _create_user(client, "2348011110006")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/stores",
            json={"name": "Report Store", "address": "1 Rd", "city": "Lagos", "state": "Lagos"},
            headers=headers,
        )
        store_id = r.json()["id"]

        # No quantity_on_hand at creation on purpose — that path itself writes an
        # "adjustment" stock movement, which would also legitimately count toward
        # today's "received" total and make this test's expected numbers ambiguous.
        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "Report Product",
                "sku": "SKU-REPORT-1",
                "cost_price_kobo": 500,
                "selling_price_kobo": 800,
            },
            headers=headers,
        )
        product_id = r.json()["id"]

        r = client.post(
            "/v1/inventory/stock/movements",
            json={
                "product_id": product_id,
                "to_store_id": store_id,
                "movement_type": "purchase",
                "quantity": 15,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text

        r = client.post(
            "/v1/inventory/stock/movements",
            json={
                "product_id": product_id,
                "from_store_id": store_id,
                "movement_type": "sale",
                "quantity": 4,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text

        today = dt.date.today().isoformat()
        r = client.get(
            f"/v1/inventory/analytics/daily-report?date={today}&store_id={store_id}",
            headers=headers,
        )
        assert r.status_code == 200, r.text
        report = r.json()
        assert report["units_received"] == 15
        assert report["units_issued"] == 4
        # 15 purchased - 4 sold = 11 units on hand, each at 500 kobo cost
        assert report["closing_value_kobo"] == 11 * 500

        r = client.get(
            f"/v1/inventory/analytics/daily-report/export.csv?date={today}&store_id={store_id}",
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("text/csv")
        assert "attachment" in r.headers["content-disposition"]
        body = r.text
        assert "Units received" in body
        assert store_id in body
        assert "15" in body and "4" in body


def test_products_csv_export():
    with TestClient(app) as client:
        user = _create_user(client, "2348011110007")
        headers = {"X-User-Id": user["id"]}

        r = client.post(
            "/v1/inventory/products",
            json={
                "name": "CSV Export Product",
                "sku": "SKU-CSV-1",
                "cost_price_kobo": 1000,
                "selling_price_kobo": 1500,
                "quantity_on_hand": 5,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text

        r = client.get("/v1/inventory/products/export.csv", headers=headers)
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("text/csv")
        assert "attachment" in r.headers["content-disposition"]
        assert "SKU-CSV-1" in r.text
        assert "CSV Export Product" in r.text

        # Regression guard: /products/export.csv must not be shadowed by the
        # dynamic /products/{product_id} route (which would 404/422 here
        # instead of returning CSV, since "export.csv" isn't a real product id).
        assert "SKU" in r.text.splitlines()[0]

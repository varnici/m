"""Tests for inventory endpoints."""
import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime

from app.main import app
from app.models.inventory import InventoryCreate
from app.services import inventory_service

client = TestClient(app)


class MockSupabaseTable:
    def __init__(self, name, db_dict):
        self.name = name
        self.db_dict = db_dict
        self._eq_col = None
        self._eq_val = None
        self._range_start = None
        self._range_end = None

    def insert(self, data):
        record = dict(data)
        if "id" not in record or not record["id"]:
            record["id"] = str(uuid4())
        
        # Calculate derived database columns like Supabase triggers/views
        price = float(record.get("price", 0.0))
        cost = float(record.get("product_cost", 0.0))
        sold = int(record.get("sold", 0))
        
        record["revenue"] = float(price * sold)
        record["profit"] = float((price - cost) * sold)
        
        now_str = datetime.utcnow().isoformat()
        if "created_at" not in record:
            record["created_at"] = now_str
        record["updated_at"] = now_str
        
        self.db_dict[self.name][record["id"]] = record
        self._last_result = [record]
        return self

    def select(self, columns):
        self._last_result = list(self.db_dict[self.name].values())
        return self

    def order(self, column, desc=False):
        self._last_result = sorted(
            self._last_result,
            key=lambda x: x.get(column, ""),
            reverse=desc
        )
        return self

    def range(self, start, end):
        self._range_start = start
        self._range_end = end
        return self

    def eq(self, column, value):
        self._eq_col = column
        self._eq_val = str(value)
        return self

    def update(self, data):
        self._update_data = data
        return self

    def delete(self):
        self._is_delete = True
        return self

    def execute(self):
        class Result:
            def __init__(self, data):
                self.data = data

        if hasattr(self, "_update_data") and self._eq_col and self._eq_val:
            updated_records = []
            for k, v in self.db_dict[self.name].items():
                if str(v.get(self._eq_col)) == self._eq_val:
                    new_data = dict(v)
                    new_data.update(self._update_data)
                    
                    # Recalculate derived database columns
                    price = float(new_data.get("price", 0.0))
                    cost = float(new_data.get("product_cost", 0.0))
                    sold = int(new_data.get("sold", 0))
                    
                    new_data["revenue"] = float(price * sold)
                    new_data["profit"] = float((price - cost) * sold)
                    new_data["updated_at"] = datetime.utcnow().isoformat()
                    
                    v.clear()
                    v.update(new_data)
                    updated_records.append(v)
            return Result(updated_records)

        if hasattr(self, "_is_delete") and self._eq_col and self._eq_val:
            deleted_records = []
            keys_to_delete = []
            for k, v in self.db_dict[self.name].items():
                if str(v.get(self._eq_col)) == self._eq_val:
                    deleted_records.append(v)
                    keys_to_delete.append(k)
            for k in keys_to_delete:
                del self.db_dict[self.name][k]
            return Result(deleted_records)

        if self._eq_col and self._eq_val:
            filtered = [
                v for v in self._last_result
                if str(v.get(self._eq_col)) == self._eq_val
            ]
            return Result(filtered)

        if self._range_start is not None and self._range_end is not None:
            ranged = self._last_result[self._range_start:self._range_end + 1]
            return Result(ranged)

        if hasattr(self, "_last_result"):
            return Result(self._last_result)

        return Result([])


class MockSupabaseClient:
    def __init__(self):
        self.db_dict = {
            "inventory": {},
            "inventory_summary": {
                "summary_id": {
                    "total_items": 1,
                    "total_sold": 20,
                    "total_revenue": 200.0,
                    "total_profit": 100.0,
                    "margin_pct": 50.0
                }
            },
            "transaction_logs": {}
        }

    def table(self, name):
        return MockSupabaseTable(name, self.db_dict)


@pytest.fixture(autouse=True)
def mock_supabase_client(monkeypatch):
    """Fixture to mock Supabase client globally for inventory tests."""
    mock_client = MockSupabaseClient()
    monkeypatch.setattr(inventory_service, "_client", lambda: mock_client)
    return mock_client


@pytest.fixture
def valid_inventory_create():
    """Fixture for valid inventory creation."""
    return {
        "product_name": "Test Product",
        "customer_id": "CUST001",
        "quantity": 100,
        "pack_quantity": 10,
        "product_cost": 5.0,
        "price": 10.0,
        "sold": 20,
    }


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_inventory(valid_inventory_create):
    """Test inventory creation."""
    response = client.post("/inventory/", json=valid_inventory_create)
    assert response.status_code == 201
    data = response.json()
    assert data["product_name"] == "Test Product"
    assert data["customer_id"] == "CUST001"
    assert "id" in data


def test_create_inventory_missing_required(valid_inventory_create):
    """Test inventory creation with missing required field."""
    del valid_inventory_create["product_name"]
    response = client.post("/inventory/", json=valid_inventory_create)
    assert response.status_code == 422


def test_list_inventory(valid_inventory_create):
    """Test listing inventory."""
    # Create an item first
    client.post("/inventory/", json=valid_inventory_create)
    
    response = client.get("/inventory/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_summary():
    """Test getting summary."""
    response = client.get("/inventory/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_items" in data
    assert "total_profit" in data


def test_update_inventory(valid_inventory_create):
    """Test updating inventory."""
    # Create item
    create_response = client.post("/inventory/", json=valid_inventory_create)
    item_id = create_response.json()["id"]
    
    # Update item
    update_data = {"sold": 50}
    response = client.patch(f"/inventory/{item_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["sold"] == 50


def test_delete_inventory(valid_inventory_create):
    """Test deleting inventory."""
    # Create item
    create_response = client.post("/inventory/", json=valid_inventory_create)
    item_id = create_response.json()["id"]
    
    # Delete item
    response = client.delete(f"/inventory/{item_id}")
    assert response.status_code == 204


def test_invalid_inventory_negative_quantity():
    """Test inventory creation with negative quantity."""
    invalid_data = {
        "product_name": "Test",
        "customer_id": "CUST001",
        "quantity": -5,  # Invalid
        "pack_quantity": 10,
        "product_cost": 5.0,
        "price": 10.0,
        "sold": 0,
    }
    response = client.post("/inventory/", json=invalid_data)
    assert response.status_code == 422


def test_sold_exceeds_quantity():
    """Test sold cannot exceed quantity."""
    invalid_data = {
        "product_name": "Test",
        "customer_id": "CUST001",
        "quantity": 10,
        "pack_quantity": 5,
        "product_cost": 5.0,
        "price": 10.0,
        "sold": 20,  # Exceeds quantity
    }
    response = client.post("/inventory/", json=invalid_data)
    assert response.status_code == 400

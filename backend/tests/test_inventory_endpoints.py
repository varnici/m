"""Tests for inventory endpoints."""
import pytest
from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.models.inventory import InventoryCreate

client = TestClient(app)


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
    assert response.status_code == 422

"""
Backend Integration Tests for Inventory Management System
Pytest with full coverage
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.services.inventory_service import InventoryService
from app.schemas.inventory_schemas import (
    StoreCreate,
    CategoryCreate,
    ProductCreate,
    StockMovementCreate,
    SupplierCreate,
    PurchaseOrderCreate,
    PurchaseOrderItemCreate,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def db_session():
    """Create in-memory SQLite test database."""
    engine = create_engine("sqlite:///:memory:")
    # Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def inventory_service(db_session):
    """Create inventory service instance."""
    owner_id = "test-owner-123"
    return InventoryService(db_session, owner_id)


@pytest.fixture
def test_store(db_session, inventory_service):
    """Create test store."""
    payload = StoreCreate(
        name="Test Retail Store",
        type="retail",
        address="123 Main St",
        city="Lagos",
        state="Lagos",
        phone="+2348012345678",
        is_primary=True,
    )
    return inventory_service.create_store(payload)


@pytest.fixture
def test_product(db_session, inventory_service):
    """Create test product."""
    payload = ProductCreate(
        sku="TEST-SKU-001",
        name="Test Product",
        category_id=None,
        cost_price_kobo=10000,  # ₦100
        selling_price_kobo=15000,  # ₦150
        minimum_stock_level=10,
        maximum_stock_level=100,
        reorder_quantity=20,
        unit_of_measure="piece",
    )
    return inventory_service.create_product(payload)


# ============================================================================
# STORE TESTS
# ============================================================================

class TestStoreOperations:
    """Test store/location management."""

    @pytest.mark.asyncio
    async def test_create_store(self, inventory_service):
        """Test store creation."""
        payload = StoreCreate(
            name="New Store",
            type="warehouse",
            address="456 Warehouse Rd",
            city="Kano",
            state="Kano",
            is_primary=False,
        )
        store = await inventory_service.create_store(payload)
        assert store.name == "New Store"
        assert store.type == "warehouse"
        assert store.is_primary is False

    def test_get_stores(self, inventory_service, test_store):
        """Test retrieving stores."""
        stores = inventory_service.get_all_stores()
        assert len(stores) >= 1
        assert any(s.id == test_store.id for s in stores)

    def test_get_store_by_id(self, inventory_service, test_store):
        """Test getting specific store."""
        store = inventory_service.get_store_by_id(test_store.id)
        assert store.id == test_store.id
        assert store.name == test_store.name

    def test_get_nonexistent_store(self, inventory_service):
        """Test error on nonexistent store."""
        with pytest.raises(ValueError):
            inventory_service.get_store_by_id("nonexistent-id")


# ============================================================================
# PRODUCT TESTS
# ============================================================================

class TestProductOperations:
    """Test product management."""

    @pytest.mark.asyncio
    async def test_create_product(self, inventory_service):
        """Test product creation."""
        payload = ProductCreate(
            sku="NEW-SKU-001",
            name="New Product",
            cost_price_kobo=5000,
            selling_price_kobo=8000,
            minimum_stock_level=5,
            maximum_stock_level=50,
            reorder_quantity=10,
            unit_of_measure="piece",
        )
        product = await inventory_service.create_product(payload)
        assert product.sku == "NEW-SKU-001"
        assert product.name == "New Product"
        assert product.cost_price_kobo == 5000

    @pytest.mark.asyncio
    async def test_duplicate_sku_raises_error(
        self, inventory_service, test_product
    ):
        """Test that duplicate SKU raises error."""
        payload = ProductCreate(
            sku=test_product.sku,  # Duplicate
            name="Different Name",
            cost_price_kobo=10000,
            selling_price_kobo=15000,
            minimum_stock_level=10,
            maximum_stock_level=100,
            reorder_quantity=20,
        )
        with pytest.raises(ValueError):
            await inventory_service.create_product(payload)

    def test_list_products(self, inventory_service, test_product):
        """Test listing products."""
        products = inventory_service.list_products()
        assert len(products) >= 1
        assert any(p.id == test_product.id for p in products)

    def test_search_products_by_name(self, inventory_service, test_product):
        """Test searching products."""
        results = inventory_service.list_products(search="Test Product")
        assert any(p.id == test_product.id for p in results)

    def test_get_product_by_barcode(self, inventory_service):
        """Test barcode search."""
        # Create product with barcode
        payload = ProductCreate(
            sku="BARCODE-TEST",
            name="Barcode Product",
            barcode="1234567890123",
            cost_price_kobo=10000,
            selling_price_kobo=15000,
            minimum_stock_level=10,
            maximum_stock_level=100,
            reorder_quantity=20,
        )
        product = inventory_service.create_product(payload)
        
        # Search by barcode
        found = inventory_service.get_product_by_barcode("1234567890123")
        assert found.id == product.id

    @pytest.mark.asyncio
    async def test_update_product(self, inventory_service, test_product):
        """Test product update."""
        from app.schemas.inventory_schemas import ProductUpdate
        
        update_payload = ProductUpdate(
            name="Updated Product",
            selling_price_kobo=20000,
        )
        updated = await inventory_service.update_product(
            test_product.id, update_payload
        )
        assert updated.name == "Updated Product"
        assert updated.selling_price_kobo == 20000


# ============================================================================
# STOCK MANAGEMENT TESTS
# ============================================================================

class TestStockManagement:
    """Test stock level and movement tracking."""

    @pytest.mark.asyncio
    async def test_record_sale(
        self, inventory_service, test_product, test_store
    ):
        """Test recording a sale."""
        # First, add stock
        add_payload = StockMovementCreate(
            product_id=test_product.id,
            to_store_id=test_store.id,
            movement_type="purchase",
            quantity=50,
            input_method="api",
        )
        await inventory_service.record_stock_movement(add_payload)

        # Record sale
        sale_payload = StockMovementCreate(
            product_id=test_product.id,
            from_store_id=test_store.id,
            movement_type="sale",
            quantity=10,
            input_method="api",
        )
        movement = await inventory_service.record_stock_movement(
            sale_payload
        )
        assert movement.quantity == 10
        assert movement.movement_type == "sale"

    @pytest.mark.asyncio
    async def test_insufficient_stock_prevents_sale(
        self, inventory_service, test_product, test_store
    ):
        """Test that sale is prevented if insufficient stock."""
        sale_payload = StockMovementCreate(
            product_id=test_product.id,
            from_store_id=test_store.id,
            movement_type="sale",
            quantity=1000,  # More than available
            input_method="api",
        )
        with pytest.raises(ValueError):
            await inventory_service.record_stock_movement(sale_payload)

    @pytest.mark.asyncio
    async def test_transfer_stock(
        self, inventory_service, test_product, test_store, db_session
    ):
        """Test transferring stock between stores."""
        # Create second store
        store2_payload = StoreCreate(
            name="Store 2",
            type="retail",
            address="789 Oak St",
            city="Abuja",
            state="FCT",
        )
        store2 = await inventory_service.create_store(store2_payload)

        # Add stock to store 1
        add_payload = StockMovementCreate(
            product_id=test_product.id,
            to_store_id=test_store.id,
            movement_type="purchase",
            quantity=100,
            input_method="api",
        )
        await inventory_service.record_stock_movement(add_payload)

        # Transfer
        transfer_payload = StockMovementCreate(
            product_id=test_product.id,
            from_store_id=test_store.id,
            to_store_id=store2.id,
            movement_type="transfer",
            quantity=30,
            input_method="api",
        )
        await inventory_service.record_stock_movement(transfer_payload)

        # Verify
        store1_stock = inventory_service.get_stock_levels(test_store.id)
        store2_stock = inventory_service.get_stock_levels(store2.id)

        assert len(store1_stock) > 0
        assert len(store2_stock) > 0

    def test_get_stock_movements_history(
        self, inventory_service, test_product, test_store
    ):
        """Test retrieving stock movement history."""
        movements = inventory_service.get_stock_movements(
            store_id=test_store.id, product_id=test_product.id
        )
        assert isinstance(movements, list)


# ============================================================================
# SUPPLIER TESTS
# ============================================================================

class TestSupplierManagement:
    """Test supplier management."""

    @pytest.mark.asyncio
    async def test_create_supplier(self, inventory_service):
        """Test creating supplier."""
        payload = SupplierCreate(
            name="Test Supplier",
            phone="+2349876543210",
            address="123 Supplier St",
            city="Enugu",
            state="Enugu",
            payment_terms="net_30",
            lead_time_days=7,
        )
        supplier = await inventory_service.create_supplier(payload)
        assert supplier.name == "Test Supplier"
        assert supplier.status == "active"

    def test_list_suppliers(self, inventory_service):
        """Test listing suppliers."""
        suppliers = inventory_service.get_all_suppliers()
        assert isinstance(suppliers, list)

    @pytest.mark.asyncio
    async def test_update_supplier(self, inventory_service):
        """Test updating supplier."""
        payload = SupplierCreate(
            name="Original Name",
            phone="+2349876543210",
            address="123 St",
            city="Lagos",
            state="Lagos",
        )
        supplier = await inventory_service.create_supplier(payload)

        from app.schemas.inventory_schemas import SupplierUpdate

        update = SupplierUpdate(name="Updated Name")
        updated = await inventory_service.update_supplier(
            supplier.id, update
        )
        assert updated.name == "Updated Name"


# ============================================================================
# PURCHASE ORDER TESTS
# ============================================================================

class TestPurchaseOrders:
    """Test purchase order management."""

    @pytest.mark.asyncio
    async def test_create_purchase_order(
        self, inventory_service, test_product, test_store
    ):
        """Test creating purchase order."""
        supplier_payload = SupplierCreate(
            name="Test Supplier",
            phone="+2349876543210",
            address="123 St",
            city="Lagos",
            state="Lagos",
        )
        supplier = await inventory_service.create_supplier(supplier_payload)

        po_payload = PurchaseOrderCreate(
            supplier_id=supplier.id,
            store_id=test_store.id,
            po_number="PO-2024-001",
            items=[
                PurchaseOrderItemCreate(
                    product_id=test_product.id,
                    quantity_ordered=50,
                    unit_price_kobo=10000,
                )
            ],
            expected_delivery_date=date.today() + timedelta(days=7),
        )
        po = await inventory_service.create_purchase_order(po_payload)
        assert po.po_number == "PO-2024-001"
        assert po.status == "draft"
        assert po.total_amount_kobo == 500000

    @pytest.mark.asyncio
    async def test_confirm_purchase_order(
        self, inventory_service, test_product, test_store
    ):
        """Test confirming PO."""
        supplier_payload = SupplierCreate(
            name="Test Supplier",
            phone="+2349876543210",
            address="123 St",
            city="Lagos",
            state="Lagos",
        )
        supplier = await inventory_service.create_supplier(supplier_payload)

        po_payload = PurchaseOrderCreate(
            supplier_id=supplier.id,
            store_id=test_store.id,
            items=[
                PurchaseOrderItemCreate(
                    product_id=test_product.id,
                    quantity_ordered=50,
                    unit_price_kobo=10000,
                )
            ],
        )
        po = await inventory_service.create_purchase_order(po_payload)

        confirmed = await inventory_service.confirm_purchase_order(po.id)
        assert confirmed.status == "confirmed"

    @pytest.mark.asyncio
    async def test_receive_purchase_order(
        self, inventory_service, test_product, test_store
    ):
        """Test receiving PO and updating stock."""
        supplier_payload = SupplierCreate(
            name="Test Supplier",
            phone="+2349876543210",
            address="123 St",
            city="Lagos",
            state="Lagos",
        )
        supplier = await inventory_service.create_supplier(supplier_payload)

        po_payload = PurchaseOrderCreate(
            supplier_id=supplier.id,
            store_id=test_store.id,
            items=[
                PurchaseOrderItemCreate(
                    product_id=test_product.id,
                    quantity_ordered=50,
                    unit_price_kobo=10000,
                )
            ],
        )
        po = await inventory_service.create_purchase_order(po_payload)
        await inventory_service.confirm_purchase_order(po.id)

        # Receive
        received = await inventory_service.receive_purchase_order(po.id)
        assert received.status == "received"
        assert received.actual_delivery_date == date.today()


# ============================================================================
# ANALYTICS TESTS
# ============================================================================

class TestAnalytics:
    """Test analytics and insights."""

    def test_calculate_inventory_metrics(
        self, inventory_service, test_product, test_store
    ):
        """Test inventory metrics calculation."""
        metrics = inventory_service.calculate_inventory_metrics(
            store_id=test_store.id
        )
        assert metrics.store_id == test_store.id
        assert metrics.date == date.today()
        assert metrics.total_inventory_value_kobo >= 0

    def test_get_product_health_scores(
        self, inventory_service, test_product
    ):
        """Test product health scoring."""
        health_scores = inventory_service.get_product_health_scores(limit=10)
        assert isinstance(health_scores, list)

    def test_detect_dead_stock(self, inventory_service, test_product):
        """Test dead stock detection."""
        dead_stock = inventory_service.detect_dead_stock(days_no_sales=30)
        assert isinstance(dead_stock, list)

    def test_turnover_ratio(self, inventory_service, test_product):
        """Test inventory turnover calculation."""
        result = inventory_service.calculate_turnover_ratio(
            product_id=test_product.id, days=30
        )
        assert "turnover_ratio" in result
        assert result["turnover_ratio"] >= 0


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

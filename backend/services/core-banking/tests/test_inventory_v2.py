import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.inventory import Base, Store, Category, Product, StockLevel
from app.models.inventory_domain import InventoryReservationModel, InventoryLedgerEntryModel
from app.services.inventory_service_v2 import InventoryServiceV2
from app.schemas.inventory_schemas import (
    StoreCreate, ProductCreate, StockMovementCreate, 
    SalesTransactionCreate, SalesTransactionItemCreate,
    StockReservationCreate, StockReservationAction
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def db_session():
    """Create in-memory SQLite test database with selected tables."""
    engine = create_engine("sqlite:///:memory:")

    from app.models.user import User
    from app.models import (
        Store, Category, Product, Supplier, StockLevel,
        StockMovement, PurchaseOrder, PurchaseOrderItem,
        SalesTransaction, SalesTransactionItem
    )
    from app.models.inventory_domain import (
        InventoryLedgerEntryModel, InventoryIdempotencyKeyModel,
        DomainOutboxMessageModel, InventoryReservationModel
    )

    # User MUST be created first — all inventory tables FK → users.id
    tables = [
        User.__table__,  # ← dependency anchor for all FK references
        Store.__table__, Category.__table__, Product.__table__,
        Supplier.__table__, StockLevel.__table__, StockMovement.__table__,
        PurchaseOrder.__table__, PurchaseOrderItem.__table__,
        SalesTransaction.__table__, SalesTransactionItem.__table__,
        InventoryLedgerEntryModel.__table__, InventoryIdempotencyKeyModel.__table__,
        DomainOutboxMessageModel.__table__, InventoryReservationModel.__table__,
    ]

    for table in tables:
        table.create(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed the test owner row so FK inserts succeed
    session.execute(
        User.__table__.insert().values(
            id="test-owner",
            phone="+2348000000000",
            category="business_owner",
            security_type="pin",
            trust_level="bronze",
        )
    )
    session.commit()

    yield session
    session.close()

@pytest.fixture
def service(db_session, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "inventory_domain_enabled", True)
    owner_id = "test-owner"
    return InventoryServiceV2(db_session, owner_id)

@pytest.fixture(scope="function")
def store(service):
    payload = StoreCreate(name="Test Store", type="retail", address="123 St", city="Lagos", state="Lagos")
    return service.create_store(payload)

@pytest.fixture(scope="function")
def product(service):
    payload = ProductCreate(
        sku="SKU-123", name="Test Product", cost_price_kobo=1000, 
        selling_price_kobo=2000, minimum_stock_level=5, unit_of_measure="pcs"
    )
    return service.create_product(payload)

# ============================================================================
# TESTS
# ============================================================================

class TestInventoryV2Flows:
    
    def test_create_sales_transaction_auto_reservation(self, service, store, product):
        # 1. Add initial stock
        service.record_stock_movement(StockMovementCreate(
            product_id=product.id, to_store_id=store.id, movement_type="purchase", quantity=100, input_method="api"
        ))
        
        # 2. Create sale without reservation_id
        payload = SalesTransactionCreate(
            store_id=store.id,
            total_amount_kobo=2000,
            payment_method="cash",
            items=[
                SalesTransactionItemCreate(product_id=product.id, quantity_sold=2, unit_price_kobo=1000)
            ]
        )
        
        sale = service.create_sales_transaction(payload)
        assert sale.id is not None
        
        # 3. Verify stock levels
        stock = service.db.query(StockLevel).filter_by(product_id=product.id, store_id=store.id).first()
        assert stock.quantity_on_hand == 98
        assert stock.quantity_reserved == 0 # Should be 0 because it was committed
        
        # 4. Verify ledger
        ledger_entries = service.db.query(InventoryLedgerEntryModel).filter_by(product_id=product.id, store_id=store.id).all()
        # Purchase (100) + Sale Commit (-2)
        assert len(ledger_entries) == 2 
        sale_entry = next(e for e in ledger_entries if e.quantity_delta == -2)
        assert sale_entry.reference_type == "reservation_commit"
        # reference_id for committed reservation is the reservation ID itself in current implementation

    def test_reconciliation_detects_drift(self, service, store, product):
        # 1. Setup matching state
        service.record_stock_movement(StockMovementCreate(
            product_id=product.id, to_store_id=store.id, movement_type="purchase", quantity=10, input_method="api"
        ))
        
        # 2. Artificially create drift (bypass service logic)
        stock = service.db.query(StockLevel).filter_by(product_id=product.id, store_id=store.id).first()
        stock.quantity_on_hand = 15 # Should be 10 as per ledger
        service.db.commit()
        
        # 3. Run reconciliation
        report = service.reconcile_inventory(store.id, product.id)
        assert len(report) == 1
        drift_item = report[0]
        # Since it returns dictionaries or models (depending on if FastAPI parses it, but here it's a direct service call):
        drift = drift_item.get("drift") if isinstance(drift_item, dict) else getattr(drift_item, "drift")
        assert drift == 5
        status = drift_item.get("status") if isinstance(drift_item, dict) else getattr(drift_item, "status")
        assert status == "mismatch"

    def test_reservation_cleanup(self, service, store, product):
        # 1. Add stock
        service.record_stock_movement(StockMovementCreate(
            product_id=product.id, to_store_id=store.id, movement_type="purchase", quantity=10, input_method="api"
        ))
        
        # 2. Create reservation that expires in the past
        res_payload = StockReservationCreate(
            product_id=product.id,
            store_id=store.id,
            quantity=5
        )
        res = service.reserve_stock(res_payload)
        
        # Force expiration
        db_res = service.db.get(InventoryReservationModel, res.id)
        db_res.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        service.db.commit()
        
        # 3. Run cleanup
        count = service.cleanup_expired_reservations()
        assert count == 1
        
        # 4. Verify stock returned
        stock = service.db.query(StockLevel).filter_by(product_id=product.id, store_id=store.id).first()
        assert stock.quantity_reserved == 0
        assert stock.quantity_on_hand == 10


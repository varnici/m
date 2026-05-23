"""
Unit Tests for StockService
Verifies ledger-first patterns, reservations, and movements.
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure.database import Base
from app.models.user import User
from app.models.inventory import Store, Product, StockLevel, StockMovement, Category
from app.models.inventory_domain import (
    InventoryLedgerEntryModel,
    InventoryIdempotencyKeyModel,
    DomainOutboxMessageModel,
    InventoryReservationModel
)
from app.services.stock_service import StockService
from app.schemas.inventory_schemas import (
    StockMovementCreate,
    StockReservationCreate,
    StockReservationAction
)

@pytest.fixture
def db_session():
    """Create in-memory SQLite test database with necessary tables."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    
    # Create tables in strict dependency order for SQLite
    User.__table__.create(engine)
    Category.__table__.create(engine)
    Store.__table__.create(engine)
    Product.__table__.create(engine)
    StockLevel.__table__.create(engine)
    StockMovement.__table__.create(engine)
    InventoryLedgerEntryModel.__table__.create(engine)
    InventoryIdempotencyKeyModel.__table__.create(engine)
    DomainOutboxMessageModel.__table__.create(engine)
    InventoryReservationModel.__table__.create(engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_owner_id(db_session):
    owner = User(
        id="test-owner-uuid",
        phone="+2348000000000",
        full_name="Test Owner"
    )
    db_session.add(owner)
    db_session.commit()
    return owner.id

@pytest.fixture
def stock_service(db_session, test_owner_id):
    return StockService(db_session, test_owner_id)

@pytest.fixture
def test_store(db_session, test_owner_id):
    store = Store(
        owner_id=test_owner_id,
        name="Test Store",
        type="retail",
        address="123 Test St",
        city="Test City",
        state="TS",
        is_primary=True
    )
    db_session.add(store)
    db_session.commit()
    return store

@pytest.fixture
def test_product(db_session, test_owner_id):
    # Create a category first (providing all required fields)
    cat = Category(
        owner_id=test_owner_id, 
        name="General",
        slug="general"
    )
    db_session.add(cat)
    db_session.flush()
    
    product = Product(
        owner_id=test_owner_id,
        sku="SKU-TEST-001",
        name="Test Item",
        category_id=cat.id,
        cost_price_kobo=1000,
        selling_price_kobo=2000,
        minimum_stock_level=10
    )
    db_session.add(product)
    db_session.commit()
    return product

def test_record_purchase_increases_stock(stock_service, test_product, test_store, db_session):
    """Test that a purchase movement increases stock level."""
    payload = StockMovementCreate(
        product_id=test_product.id,
        to_store_id=test_store.id,
        movement_type="purchase",
        quantity=100,
        input_method="api"
    )
    
    movement = stock_service.record_stock_movement(payload)
    
    assert movement.quantity == 100
    assert movement.to_store_id == test_store.id
    
    # Verify stock level
    level = db_session.query(StockLevel).filter_by(
        product_id=test_product.id,
        store_id=test_store.id
    ).first()
    assert level.quantity_on_hand == 100
    assert level.status == "in_stock"

def test_reserve_stock_decreases_available(stock_service, test_product, test_store, db_session):
    """Test that reserving stock decreases available quantity."""
    # 1. Add initial stock
    stock_service.record_stock_movement(StockMovementCreate(
        product_id=test_product.id,
        to_store_id=test_store.id,
        movement_type="purchase",
        quantity=50,
        input_method="api"
    ))
    
    # 2. Reserve
    res_payload = StockReservationCreate(
        product_id=test_product.id,
        store_id=test_store.id,
        quantity=20,
        purpose="test"
    )
    reservation = stock_service.reserve_stock(res_payload)
    
    assert reservation.quantity_reserved == 20
    assert reservation.status == "active"
    
    # 3. Check level (On hand should be 50, but available should be 30)
    level = db_session.query(StockLevel).filter_by(
        product_id=test_product.id,
        store_id=test_store.id
    ).first()
    assert level.quantity_on_hand == 50
    assert level.quantity_reserved == 20
    assert level.quantity_available == 30

def test_commit_reservation_depletes_stock(stock_service, test_product, test_store, db_session):
    """Test that committing a reservation updates on-hand quantity."""
    # 1. Setup stock & reservation
    stock_service.record_stock_movement(StockMovementCreate(
        product_id=test_product.id,
        to_store_id=test_store.id,
        movement_type="purchase",
        quantity=50,
        input_method="api"
    ))
    res = stock_service.reserve_stock(StockReservationCreate(
        product_id=test_product.id,
        store_id=test_store.id,
        quantity=20,
        purpose="sale"
    ))
    
    # 2. Commit
    stock_service.commit_stock_reservation(
        reservation_id=res.id,
        payload=StockReservationAction(quantity=20)
    )
    
    # 3. Verify stock level (50 - 20 = 30)
    level = db_session.query(StockLevel).filter_by(
        product_id=test_product.id,
        store_id=test_store.id
    ).first()
    assert level.quantity_on_hand == 30
    assert level.quantity_reserved == 0

def test_insufficient_stock_raises_error(stock_service, test_product, test_store):
    """Test that moving more stock than available raises ValueError."""
    payload = StockMovementCreate(
        product_id=test_product.id,
        from_store_id=test_store.id,
        movement_type="sale",
        quantity=10,
        input_method="api"
    )
    
    with pytest.raises(ValueError, match="Insufficient stock"):
        stock_service.record_stock_movement(payload)


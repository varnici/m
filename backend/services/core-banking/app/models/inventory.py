from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Numeric,
    Enum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String, default="retail", nullable=False)
    business_type: Mapped[str | None] = mapped_column(String, nullable=True, default="custom")
    address: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(11, 8), nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    stock_levels = relationship("StockLevel", back_populates="store")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    icon: Mapped[str | None] = mapped_column(String, nullable=True, default="Package")
    tint: Mapped[str | None] = mapped_column(String(7), nullable=True, default="#2E6E9E")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_owner_active", "owner_id", "is_active"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    sku: Mapped[str] = mapped_column(String, nullable=False)
    barcode: Mapped[str | None] = mapped_column(String, nullable=True)
    qr_code: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[str | None] = mapped_column(String, nullable=True)
    unit_of_measure: Mapped[str] = mapped_column(String, default="piece")
    cost_price_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    selling_price_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    minimum_stock_level: Mapped[int] = mapped_column(Integer, default=10)
    maximum_stock_level: Mapped[int] = mapped_column(Integer, default=1000)
    reorder_quantity: Mapped[int] = mapped_column(Integer, default=100)
    supplier_lead_time_days: Mapped[int] = mapped_column(Integer, default=7)
    is_perishable: Mapped[bool] = mapped_column(Boolean, default=False)
    shelf_life_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_lot_tracking: Mapped[bool] = mapped_column(Boolean, default=False)
    nafdac_number: Mapped[str | None] = mapped_column(String, nullable=True)
    size: Mapped[str | None] = mapped_column(String, nullable=True)
    imei: Mapped[str | None] = mapped_column(String, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    # Business tracking fields (expenses, sales, credit)
    expenses_kobo: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    quantity_on_credit: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Dual-channel sales and stock verification fields
    trade_price_kobo: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    expected_amount: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    actual_amount: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    discrepancy_qty: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    monthly_velocity: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    days_of_supply: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    trade_moq: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    # Marketplace compatibility fields
    unit_price_kobo: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    estate: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Bulk/Packaging handling
    parent_id: Mapped[str | None] = mapped_column(String, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    conversion_factor: Mapped[int] = mapped_column(Integer, default=1) 

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    category = relationship("Category", back_populates="products")
    stock_levels = relationship("StockLevel", back_populates="product")
    movements = relationship("StockMovement", back_populates="product")
    
    # Self-referential relationship for parent-child products
    children = relationship("Product", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")

    @property
    def retail_price_kobo(self) -> int:
        return self.selling_price_kobo

    @property
    def retail_margin_pct(self) -> float:
        if self.selling_price_kobo <= 0:
            return 0.0
        return round(((self.selling_price_kobo - self.cost_price_kobo) / self.selling_price_kobo) * 100, 2)

    @property
    def trade_margin_pct(self) -> float:
        trade_price = self.trade_price_kobo or self.selling_price_kobo
        if trade_price <= 0:
            return 0.0
        return round(((trade_price - self.cost_price_kobo) / trade_price) * 100, 2)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    bank_name: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_terms: Mapped[str] = mapped_column(String, default="net_30")
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7)
    minimum_order_value_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="active")
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=5.00)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class StockLevel(Base):
    __tablename__ = "stock_levels"
    __table_args__ = (
        CheckConstraint("quantity_on_hand >= 0", name="ck_stock_levels_quantity_on_hand_non_negative"),
        CheckConstraint("quantity_reserved >= 0", name="ck_stock_levels_quantity_reserved_non_negative"),
        Index("ix_stock_levels_product_store", "product_id", "store_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="in_stock")
    last_counted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_movement_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="stock_levels")
    store = relationship("Store", back_populates="stock_levels")

    @property
    def quantity_available(self) -> int:
        return self.quantity_on_hand - self.quantity_reserved


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_stock_movements_quantity_positive"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    from_store_id: Mapped[str | None] = mapped_column(String, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    to_store_id: Mapped[str | None] = mapped_column(String, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    movement_type: Mapped[str] = mapped_column(String, nullable=False)
    input_method: Mapped[str] = mapped_column(String, default="manual")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_input_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    staff_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="movements")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        CheckConstraint("total_amount_kobo >= 0", name="ck_purchase_orders_total_amount_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(String, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    store_id: Mapped[str] = mapped_column(String, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    po_number: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")
    total_amount_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    supplier = relationship("Supplier")
    store = relationship("Store")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    __table_args__ = (
        CheckConstraint("quantity_ordered > 0", name="ck_purchase_order_items_quantity_ordered_positive"),
        CheckConstraint("quantity_received >= 0", name="ck_purchase_order_items_quantity_received_non_negative"),
        CheckConstraint("unit_price_kobo >= 0", name="ck_purchase_order_items_unit_price_non_negative"),
        CheckConstraint("line_total_kobo >= 0", name="ck_purchase_order_items_line_total_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    purchase_order_id: Mapped[str] = mapped_column(String, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, default=0)
    unit_price_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")


class SalesTransaction(Base):
    __tablename__ = "sales_transactions"
    __table_args__ = (
        CheckConstraint("total_amount_kobo >= 0", name="ck_sales_transactions_total_amount_non_negative"),
        CheckConstraint("discount_amount_kobo >= 0", name="ck_sales_transactions_discount_non_negative"),
        CheckConstraint("shipping_fee_kobo >= 0", name="ck_sales_transactions_shipping_fee_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id: Mapped[str | None] = mapped_column(String, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    
    # Customer Tracking
    customer_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String, nullable=True) # For guest users
    customer_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    
    total_amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discount_amount_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    payment_method: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Marketplace/Order Fields
    status: Mapped[str] = mapped_column(String, default="completed") # completed, pending, processing, shipped, delivered, cancelled
    order_type: Mapped[str] = mapped_column(String, default="pos") # pos, online
    shipping_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipping_city: Mapped[str | None] = mapped_column(String, nullable=True)
    shipping_state: Mapped[str | None] = mapped_column(String, nullable=True)
    shipping_fee_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items = relationship("SalesTransactionItem", back_populates="transaction")


class SalesTransactionItem(Base):
    __tablename__ = "sales_transaction_items"
    __table_args__ = (
        CheckConstraint("quantity_sold > 0", name="ck_sales_transaction_items_quantity_sold_positive"),
        CheckConstraint("unit_price_kobo >= 0", name="ck_sales_transaction_items_unit_price_non_negative"),
        CheckConstraint("line_total_kobo >= 0", name="ck_sales_transaction_items_line_total_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    sale_id: Mapped[str] = mapped_column(String, ForeignKey("sales_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity_sold: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    transaction = relationship("SalesTransaction", back_populates="items")
    product = relationship("Product")


class ActivityLog(Base):
    """Immutable audit trail for all inventory mutations.
    Captures WHO (actor_id) did WHAT (action) to WHICH entity,
    under WHOSE business (owner_id), with before/after snapshots.
    """
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_owner_created", "owner_id", "created_at"),
        Index("ix_activity_logs_actor", "actor_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)  # create, update, delete, stock_adjust, sale, credit_given, credit_paid
    entity_type: Mapped[str] = mapped_column(String, nullable=False)  # product, stock, sale, purchase_order
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string with before/after
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", foreign_keys=[owner_id])


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    total_inventory_value_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_quantity_on_hand: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    low_stock_items_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    out_of_stock_items_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inventory_turnover_ratio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    store = relationship("Store")


class TradeClient(Base):
    """A business owner's own B2B customer (not another platform account)."""
    __tablename__ = "trade_clients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    vat_number: Mapped[str | None] = mapped_column(String, nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String, nullable=True)
    default_payment_terms: Mapped[str] = mapped_column(String, default="immediate")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class TradeOrder(Base):
    """Persisted B2B order/invoice — carries the Hold/Allocate -> Finalize/Dispatch
    lifecycle. Each line's stock_service reservation id is stored on TradeOrderLine
    so dispatch commits the SAME reservation instead of re-reserving from scratch."""
    __tablename__ = "trade_orders"
    __table_args__ = (
        CheckConstraint("total_kobo >= 0", name="ck_trade_orders_total_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String, ForeignKey("trade_clients.id", ondelete="RESTRICT"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft, held, dispatched, cancelled
    payment_terms: Mapped[str] = mapped_column(String, default="immediate")  # immediate, net30
    total_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    sale_id: Mapped[str | None] = mapped_column(String, ForeignKey("sales_transactions.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    client = relationship("TradeClient")
    store = relationship("Store")
    lines = relationship("TradeOrderLine", back_populates="order", cascade="all, delete-orphan")


class TradeOrderLine(Base):
    __tablename__ = "trade_order_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_trade_order_lines_quantity_positive"),
        CheckConstraint("unit_price_kobo >= 0", name="ck_trade_order_lines_unit_price_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    trade_order_id: Mapped[str] = mapped_column(String, ForeignKey("trade_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reservation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    order = relationship("TradeOrder", back_populates="lines")
    product = relationship("Product")

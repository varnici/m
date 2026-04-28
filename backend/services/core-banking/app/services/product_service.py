from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import (
    Category,
    InventoryReservationModel,
    Product,
    SalesTransactionItem,
    StockLevel,
    StockMovement,
    Store,
)
from app.schemas.inventory_schemas import (
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductDetailOut,
    ProductOut,
    ProductUpdate,
    StockLevelOut,
    StoreCreate,
    StoreOut,
)

logger = logging.getLogger(__name__)


class ProductService:
    """
    Product/store/category domain service extracted from InventoryServiceV2.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.DEAD_STOCK_DAYS = 30
        self.LOW_STOCK_THRESHOLD_PCT = 0.20

    def create_store(self, payload: StoreCreate) -> StoreOut:
        if payload.is_primary:
            self.db.query(Store).filter(
                Store.owner_id == self.owner_id,
                Store.is_primary == True,
            ).update({Store.is_primary: False})

        store = Store(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return StoreOut.model_validate(store)

    def get_all_stores(self) -> List[StoreOut]:
        stores = self.db.query(Store).filter(Store.owner_id == self.owner_id).all()
        return [StoreOut.model_validate(s) for s in stores]

    def get_store_by_id(self, store_id: str) -> StoreOut:
        store = self.db.query(Store).filter(
            Store.id == store_id,
            Store.owner_id == self.owner_id,
        ).first()
        if not store:
            raise ValueError(f"Store {store_id} not found")
        return StoreOut.model_validate(store)

    def update_store(self, store_id: str, payload: StoreCreate) -> StoreOut:
        store = self.db.query(Store).filter(
            Store.id == store_id,
            Store.owner_id == self.owner_id,
        ).first()
        if not store:
            raise ValueError(f"Store {store_id} not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(store, field, value)

        store.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(store)
        return StoreOut.model_validate(store)

    def create_category(self, payload: CategoryCreate) -> CategoryOut:
        category = Category(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return CategoryOut.model_validate(category)

    def get_all_categories(self) -> List[CategoryOut]:
        categories = (
            self.db.query(Category)
            .filter(Category.owner_id == self.owner_id, Category.is_active == True)
            .order_by(Category.position)
            .all()
        )
        return [CategoryOut.model_validate(c) for c in categories]

    def create_product(self, payload: ProductCreate) -> ProductOut:
        try:
            existing = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.sku == payload.sku,
            ).first()
            if existing:
                raise ValueError(f"SKU {payload.sku} already exists")

            product_data = payload.model_dump(exclude={"quantity_on_hand", "store_id"})
            initial_qty = payload.quantity_on_hand
            target_store_id = payload.store_id

            if product_data.get("category_id"):
                cat_exists = (
                    self.db.query(Category)
                    .filter(Category.id == product_data["category_id"])
                    .first()
                )
                if not cat_exists:
                    product_data["category_id"] = None

            product = Product(owner_id=self.owner_id, **product_data)
            self.db.add(product)
            self.db.flush()

            if initial_qty is not None:
                if not target_store_id:
                    primary_store = self.db.query(Store).filter(
                        Store.owner_id == self.owner_id,
                        Store.is_primary == True,
                    ).first()
                    if not primary_store:
                        primary_store = (
                            self.db.query(Store)
                            .filter(Store.owner_id == self.owner_id)
                            .first()
                        )
                    if not primary_store:
                        primary_store = Store(
                            owner_id=self.owner_id,
                            name="Default Store",
                            address="Main Street",
                            city="Default City",
                            state="Default State",
                            is_primary=True,
                        )
                        self.db.add(primary_store)
                        self.db.flush()
                    target_store_id = primary_store.id

                stock = StockLevel(
                    product_id=product.id,
                    store_id=target_store_id,
                    quantity_on_hand=initial_qty,
                    status="in_stock"
                    if initial_qty > product.minimum_stock_level
                    else "low_stock",
                )
                self.db.add(stock)

                movement = StockMovement(
                    owner_id=self.owner_id,
                    product_id=product.id,
                    to_store_id=target_store_id,
                    movement_type="adjustment",
                    quantity=initial_qty,
                    notes="Initial stock upon product creation",
                )
                self.db.add(movement)

            self.db.commit()
            self.db.refresh(product)
            return ProductOut.model_validate(product)
        except ValueError as exc:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception:
            self.db.rollback()
            logger.exception("Error creating product")
            raise HTTPException(
                status_code=500, detail="Internal server error while creating product"
            )

    def list_products(
        self,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        store_id: Optional[str] = None,
    ) -> tuple[List[ProductOut], int]:
        query = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.is_active == True,
        )
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term),
                )
            )

        total_count = query.count()
        products = query.offset(skip).limit(limit).all()
        product_ids = [p.id for p in products]

        if not product_ids:
            return [], total_count

        stock_query = self.db.query(StockLevel).filter(StockLevel.product_id.in_(product_ids))
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        stock_levels = stock_query.all()

        stock_map: dict[str, int] = {}
        for s in stock_levels:
            stock_map[s.product_id] = stock_map.get(s.product_id, 0) + s.quantity_on_hand

        res_query = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.product_id.in_(product_ids),
            InventoryReservationModel.status == "active",
        )
        if store_id:
            res_query = res_query.filter(InventoryReservationModel.store_id == store_id)
        reservations = res_query.all()

        reservation_map: dict[str, int] = {}
        for r in reservations:
            net_res = r.quantity_reserved - r.quantity_released - r.quantity_committed
            if net_res > 0:
                reservation_map[r.product_id] = (
                    reservation_map.get(r.product_id, 0) + net_res
                )

        result = []
        for p in products:
            p_out = ProductOut.model_validate(p)
            p_out.total_quantity_on_hand = stock_map.get(p.id, 0)
            p_out.total_reserved_quantity = reservation_map.get(p.id, 0)
            result.append(p_out)
        return result, total_count

    def get_product_by_barcode(self, barcode: str, store_id: Optional[str] = None) -> ProductOut:
        product = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            or_(Product.barcode == barcode, Product.qr_code == barcode),
        ).first()
        if not product:
            raise ValueError(f"Product with barcode {barcode} not found")

        stock_levels = self.db.query(StockLevel).filter(StockLevel.product_id == product.id).all()
        total_qoh = sum(s.quantity_on_hand for s in stock_levels)
        reservations = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.product_id == product.id,
            InventoryReservationModel.status == "active",
        ).all()
        total_res = sum(
            r.quantity_reserved - r.quantity_released - r.quantity_committed
            for r in reservations
        )

        p_out = ProductOut.model_validate(product)
        p_out.total_quantity_on_hand = total_qoh
        p_out.total_reserved_quantity = max(0, total_res)
        return p_out

    def get_product_detail(self, product_id: str, store_id: Optional[str] = None) -> ProductDetailOut:
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id,
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        stock_query = self.db.query(StockLevel).filter(StockLevel.product_id == product_id)
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        stock_levels = stock_query.all()

        total_quantity = sum(s.quantity_on_hand for s in stock_levels)
        total_reserved = sum(s.quantity_reserved for s in stock_levels)
        total_value = total_quantity * product.cost_price_kobo
        profit_per_unit = product.selling_price_kobo - product.cost_price_kobo
        margin_pct = (
            (profit_per_unit / product.cost_price_kobo * 100)
            if product.cost_price_kobo > 0
            else 0
        )

        last_sale = self.db.query(func.max(SalesTransactionItem.created_at)).filter(
            SalesTransactionItem.product_id == product_id
        ).scalar()
        is_dead_stock = False
        if last_sale:
            days_since_sale = (datetime.now(timezone.utc) - last_sale).days
            is_dead_stock = days_since_sale > self.DEAD_STOCK_DAYS

        detail = ProductDetailOut.model_validate(product)
        detail.stock_by_location = [StockLevelOut.model_validate(s) for s in stock_levels]
        detail.total_quantity_on_hand = total_quantity
        detail.total_reserved_quantity = total_reserved
        detail.total_inventory_value_kobo = int(total_value)
        detail.profit_per_unit_kobo = profit_per_unit
        detail.margin_percentage = Decimal(str(margin_pct))
        detail.is_dead_stock = is_dead_stock
        detail.children = [ProductOut.model_validate(c) for c in product.children]

        forecast = []
        today_date = date.today()
        base_demand = 10
        for i in range(1, 8):
            forecast_date = today_date + timedelta(days=i)
            variance = (i * 3) % 7
            forecast.append(
                {"date": forecast_date.strftime("%b %d"), "quantity": base_demand + variance}
            )
        detail.demand_forecast = forecast

        intelligence = []
        if is_dead_stock:
            intelligence.append(
                {
                    "headline": "Liquidation Opportunity",
                    "subtitle": f"This item has been stagnant for over {self.DEAD_STOCK_DAYS} days. Consider a 10% discount to free up capital.",
                    "impact": "negative",
                }
            )

        if total_quantity <= product.minimum_stock_level:
            intelligence.append(
                {
                    "headline": "Restock Critical",
                    "subtitle": f"Current stock ({total_quantity}) is below minimum ({product.minimum_stock_level}). Order {product.reorder_quantity} units immediately.",
                    "impact": "negative",
                }
            )
        elif total_quantity <= total_quantity * self.LOW_STOCK_THRESHOLD_PCT:
            intelligence.append(
                {
                    "headline": "Low Stock Alert",
                    "subtitle": "You are approaching critical levels. Plan a restock soon.",
                    "impact": "neutral",
                }
            )

        if not intelligence:
            intelligence.append(
                {
                    "headline": "Healthy Performance",
                    "subtitle": "Inventory levels are optimal for current demand patterns.",
                    "impact": "positive",
                }
            )
        detail.ai_intelligence = intelligence
        return detail

    def update_product(self, product_id: str, payload: ProductUpdate) -> ProductOut:
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id,
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        update_data = payload.model_dump(exclude_unset=True)
        if update_data.get("category_id"):
            cat_exists = (
                self.db.query(Category).filter(Category.id == update_data["category_id"]).first()
            )
            if not cat_exists:
                update_data["category_id"] = None

        for field, value in update_data.items():
            setattr(product, field, value)

        product.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(product)
        return ProductOut.model_validate(product)

    def delete_product(self, product_id: str) -> None:
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id,
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        product.is_active = False
        product.updated_at = datetime.now(timezone.utc)
        self.db.commit()

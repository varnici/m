from __future__ import annotations

import logging
import re
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
    CategoryBulkCreateRequest,
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    DemandForecastPoint,
    ProductCreate,
    ProductDetailOut,
    ProductIntelligence,
    ProductOut,
    ProductUpdate,
    StockLevelOut,
    StoreCreate,
    StoreOut,
)

logger = logging.getLogger(__name__)


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "category"


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

    def bulk_create_categories(self, payload: "CategoryBulkCreateRequest") -> List[CategoryOut]:
        created: List[Category] = []
        for item in payload.categories:
            slug = item.slug or slugify(item.name)
            category = Category(
                owner_id=self.owner_id,
                name=item.name,
                slug=slug,
                icon=item.icon,
                tint=item.tint,
                parent_id=item.parent_id,
            )
            self.db.add(category)
            created.append(category)
        self.db.commit()
        for category in created:
            self.db.refresh(category)
        return [CategoryOut.model_validate(c) for c in created]

    def update_category(self, category_id: str, payload: "CategoryUpdate") -> CategoryOut:
        category = self.db.query(Category).filter(
            Category.id == category_id,
            Category.owner_id == self.owner_id,
        ).first()
        if not category:
            raise ValueError(f"Category {category_id} not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(category, field, value)

        category.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(category)
        return CategoryOut.model_validate(category)

    def delete_category(self, category_id: str) -> None:
        category = self.db.query(Category).filter(
            Category.id == category_id,
            Category.owner_id == self.owner_id,
        ).first()
        if not category:
            raise ValueError(f"Category {category_id} not found")

        # Product.category_id has ondelete="SET NULL" at the DB level, so any
        # products in this category simply become uncategorized — safe hard delete.
        self.db.delete(category)
        self.db.commit()

    def _hydrate_product_output(
        self,
        product_out: ProductOut,
        product: Product,
        total_quantity: int,
        total_reserved: int = 0,
    ) -> ProductOut:
        product_out.total_quantity_on_hand = int(total_quantity or 0)
        product_out.total_reserved_quantity = max(0, int(total_reserved or 0))
        product_out.retail_price_kobo = product.selling_price_kobo
        product_out.trade_price_kobo = product.trade_price_kobo or product.selling_price_kobo
        product_out.trade_moq = max(1, product.trade_moq or 1)

        monthly_velocity = product.monthly_velocity or product.quantity_sold or 0
        product_out.monthly_velocity = int(monthly_velocity)
        if product.days_of_supply:
            product_out.days_of_supply = product.days_of_supply
        elif monthly_velocity > 0:
            daily_velocity = monthly_velocity / 30
            product_out.days_of_supply = int(total_quantity / daily_velocity) if daily_velocity > 0 else 0
        else:
            product_out.days_of_supply = 0

        expected_amount = int(total_quantity or 0)
        actual_amount = product.actual_amount if product.actual_amount > 0 else expected_amount
        product_out.expected_amount = expected_amount
        product_out.actual_amount = int(actual_amount)
        product_out.discrepancy_qty = int(expected_amount - actual_amount)

        product_out.retail_margin_pct = product.retail_margin_pct
        product_out.trade_margin_pct = product.trade_margin_pct
        return product_out

    def _validate_parent_id(self, parent_id: str) -> None:
        """A pack/bag/carton listing's parent must be one of the caller's own
        base-unit products, and can't itself be a pack (no multi-level
        chains) — StockService's depletion/replenishment math only follows
        one hop of parent_id, so a chain would silently stop converting
        partway through instead of raising."""
        parent = self.db.query(Product).filter(
            Product.id == parent_id,
            Product.owner_id == self.owner_id,
        ).first()
        if not parent:
            raise ValueError("Base product not found for this packaging link")
        if parent.parent_id:
            raise ValueError("Base product cannot itself be a pack/bag of another product")

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
            if not product_data.get("trade_price_kobo"):
                product_data["trade_price_kobo"] = payload.selling_price_kobo
            if initial_qty is not None:
                product_data["expected_amount"] = product_data.get("expected_amount") or initial_qty
                product_data["actual_amount"] = product_data.get("actual_amount") or initial_qty
                product_data["discrepancy_qty"] = (
                    product_data["expected_amount"] - product_data["actual_amount"]
                )

            if product_data.get("category_id"):
                cat_exists = (
                    self.db.query(Category)
                    .filter(Category.id == product_data["category_id"])
                    .first()
                )
                if not cat_exists:
                    product_data["category_id"] = None

            if product_data.get("parent_id"):
                self._validate_parent_id(product_data["parent_id"])

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
            p_out = ProductOut.model_validate(product)
            return self._hydrate_product_output(
                p_out,
                product,
                initial_qty or 0,
                0,
            )
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
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term),
                )
            )

        total_count = query.count()
        page = query.order_by(Product.updated_at.desc(), Product.id).offset(skip).limit(limit).subquery()

        stock_query = self.db.query(
            StockLevel.product_id.label("product_id"),
            func.coalesce(func.sum(StockLevel.quantity_on_hand), 0).label("total_quantity_on_hand"),
        ).join(page, StockLevel.product_id == page.c.id)
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        stock_totals = stock_query.group_by(StockLevel.product_id).subquery()

        reservation_query = self.db.query(
            InventoryReservationModel.product_id.label("product_id"),
            func.coalesce(
                func.sum(
                    InventoryReservationModel.quantity_reserved
                    - InventoryReservationModel.quantity_released
                    - InventoryReservationModel.quantity_committed
                ),
                0,
            ).label("total_reserved_quantity"),
        ).join(page, InventoryReservationModel.product_id == page.c.id).filter(
            InventoryReservationModel.owner_id == self.owner_id,
            InventoryReservationModel.status == "active",
        )
        if store_id:
            reservation_query = reservation_query.filter(InventoryReservationModel.store_id == store_id)
        reservation_totals = reservation_query.group_by(InventoryReservationModel.product_id).subquery()

        rows = (
            self.db.query(
                Product,
                func.coalesce(stock_totals.c.total_quantity_on_hand, 0).label("total_quantity_on_hand"),
                func.coalesce(reservation_totals.c.total_reserved_quantity, 0).label("total_reserved_quantity"),
            )
            .join(page, Product.id == page.c.id)
            .outerjoin(stock_totals, stock_totals.c.product_id == Product.id)
            .outerjoin(reservation_totals, reservation_totals.c.product_id == Product.id)
            .order_by(page.c.updated_at.desc(), page.c.id)
            .all()
        )

        result = []
        for p, total_quantity, total_reserved in rows:
            p_out = ProductOut.model_validate(p)
            result.append(
                self._hydrate_product_output(
                    p_out,
                    p,
                    int(total_quantity or 0),
                    int(total_reserved or 0),
                )
            )
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
        p_out = self._hydrate_product_output(p_out, product, total_qoh, total_res)
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
        detail = self._hydrate_product_output(detail, product, total_quantity, total_reserved)
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
        detail.demand_forecast = [DemandForecastPoint(**point) for point in forecast]

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
        elif (
            product.maximum_stock_level
            and total_quantity <= product.maximum_stock_level * self.LOW_STOCK_THRESHOLD_PCT
        ):
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
        detail.ai_intelligence = [ProductIntelligence(**item) for item in intelligence]
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

        if update_data.get("parent_id"):
            if update_data["parent_id"] == product_id:
                raise ValueError("A product cannot be its own packaging base")
            has_children = self.db.query(Product).filter(
                Product.parent_id == product_id
            ).first()
            if has_children:
                raise ValueError(
                    "This product already has its own pack/bag listings — it can't also become one"
                )
            self._validate_parent_id(update_data["parent_id"])

        for field, value in update_data.items():
            setattr(product, field, value)

        product.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(product)
        stock_total = (
            self.db.query(func.coalesce(func.sum(StockLevel.quantity_on_hand), 0))
            .filter(StockLevel.product_id == product.id)
            .scalar()
        )
        reserved_total = (
            self.db.query(func.coalesce(func.sum(StockLevel.quantity_reserved), 0))
            .filter(StockLevel.product_id == product.id)
            .scalar()
        )
        return self._hydrate_product_output(
            ProductOut.model_validate(product),
            product,
            int(stock_total or 0),
            int(reserved_total or 0),
        )

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

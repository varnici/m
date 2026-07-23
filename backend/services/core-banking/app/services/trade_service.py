from __future__ import annotations

import logging
from typing import List

from sqlalchemy.orm import Session

from app.models import Product, TradeClient, TradeOrder, TradeOrderLine
from app.schemas.inventory_schemas import (
    SalesTransactionCreate,
    SalesTransactionItemCreate,
    StockReservationCreate,
    TradeClientCreate,
    TradeClientOut,
    TradeOrderCreate,
    TradeOrderLineCreate,
    TradeOrderLineOut,
    TradeOrderOut,
)
from app.services.sales_service import SalesService
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)


class TradeClientService:
    """CRUD for a business owner's own B2B customers."""

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def create_client(self, payload: TradeClientCreate) -> TradeClientOut:
        client = TradeClient(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(client)
        self.db.commit()
        self.db.refresh(client)
        return TradeClientOut.model_validate(client)

    def list_clients(self) -> List[TradeClientOut]:
        clients = (
            self.db.query(TradeClient)
            .filter(TradeClient.owner_id == self.owner_id, TradeClient.is_active == True)
            .order_by(TradeClient.company_name)
            .all()
        )
        return [TradeClientOut.model_validate(c) for c in clients]


class TradeOrderService:
    """
    Persisted B2B order lifecycle: draft -> held -> dispatched.

    hold_order() reserves stock per line and stores each reservation id on the
    TradeOrderLine. dispatch_order() passes those same reservation ids into
    SalesService.create_sales_transaction, which commits the EXACT reservation
    instead of reserving fresh stock — this is what keeps a held order from
    permanently orphaning its reservation once dispatched.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.stock_service = StockService(db, owner_id)

    def _to_out(self, order: TradeOrder) -> TradeOrderOut:
        out = TradeOrderOut.model_validate(order)
        out.lines = [TradeOrderLineOut.model_validate(line) for line in order.lines]
        return out

    def _validate_moq(self, lines: List[TradeOrderLineCreate]) -> None:
        errors = []
        for line in lines:
            product = (
                self.db.query(Product)
                .filter(Product.id == line.product_id, Product.owner_id == self.owner_id)
                .first()
            )
            if not product:
                raise ValueError(f"Product {line.product_id} not found")
            moq = max(1, product.trade_moq or 1)
            if line.quantity < moq:
                errors.append(
                    f"{product.name}: quantity {line.quantity} is below minimum order quantity {moq}"
                )
        if errors:
            raise ValueError("; ".join(errors))

    def create_order(self, payload: TradeOrderCreate) -> TradeOrderOut:
        client = (
            self.db.query(TradeClient)
            .filter(TradeClient.id == payload.client_id, TradeClient.owner_id == self.owner_id)
            .first()
        )
        if not client:
            raise ValueError(f"Trade client {payload.client_id} not found")

        self._validate_moq(payload.lines)

        total_kobo = sum(line.quantity * line.unit_price_kobo for line in payload.lines)
        order = TradeOrder(
            owner_id=self.owner_id,
            client_id=payload.client_id,
            store_id=payload.store_id,
            status="draft",
            payment_terms=payload.payment_terms,
            total_kobo=total_kobo,
        )
        self.db.add(order)
        self.db.flush()

        for line in payload.lines:
            self.db.add(
                TradeOrderLine(
                    trade_order_id=order.id,
                    product_id=line.product_id,
                    quantity=line.quantity,
                    unit_price_kobo=line.unit_price_kobo,
                )
            )

        self.db.commit()
        self.db.refresh(order)
        return self._to_out(order)

    def get_order(self, order_id: str) -> TradeOrder:
        order = (
            self.db.query(TradeOrder)
            .filter(TradeOrder.id == order_id, TradeOrder.owner_id == self.owner_id)
            .first()
        )
        if not order:
            raise ValueError(f"Trade order {order_id} not found")
        return order

    def get_order_out(self, order_id: str) -> TradeOrderOut:
        return self._to_out(self.get_order(order_id))

    def list_orders(self) -> List[TradeOrderOut]:
        orders = (
            self.db.query(TradeOrder)
            .filter(TradeOrder.owner_id == self.owner_id)
            .order_by(TradeOrder.created_at.desc())
            .all()
        )
        return [self._to_out(o) for o in orders]

    def hold_order(self, order_id: str) -> TradeOrderOut:
        order = self.get_order(order_id)
        if order.status != "draft":
            raise ValueError(f"Cannot hold order in status '{order.status}'")

        try:
            for line in order.lines:
                reservation = self.stock_service.reserve_stock(
                    StockReservationCreate(
                        product_id=line.product_id,
                        store_id=order.store_id,
                        quantity=line.quantity,
                        purpose="trade_order",
                        reference_type="sales_order",
                        reference_id=order.id,
                    ),
                    should_commit=False,
                )
                line.reservation_id = reservation.id

            order.status = "held"
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(order)
        return self._to_out(order)

    def dispatch_order(self, order_id: str) -> TradeOrderOut:
        order = self.get_order(order_id)
        if order.status == "dispatched":
            raise ValueError("Order already dispatched")
        if order.status == "draft":
            self.hold_order(order_id)
            order = self.get_order(order_id)

        client = self.db.query(TradeClient).filter(TradeClient.id == order.client_id).first()

        sales_service = SalesService(self.db, self.owner_id)
        sale = sales_service.create_sales_transaction(
            SalesTransactionCreate(
                store_id=order.store_id,
                customer_name=client.company_name if client else None,
                payment_method="credit" if order.payment_terms == "net30" else "transfer",
                order_type="trade",
                status="completed",
                notes=(
                    "Trade invoice approved on Net 30 terms"
                    if order.payment_terms == "net30"
                    else "Trade invoice paid immediately"
                ),
                items=[
                    SalesTransactionItemCreate(
                        product_id=line.product_id,
                        quantity_sold=line.quantity,
                        unit_price_kobo=line.unit_price_kobo,
                        reservation_id=line.reservation_id,
                    )
                    for line in order.lines
                ],
            )
        )

        order.status = "dispatched"
        order.sale_id = sale.id
        self.db.commit()
        self.db.refresh(order)
        return self._to_out(order)

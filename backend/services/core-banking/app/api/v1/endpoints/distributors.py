from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.onboarding import DistributorProfile
from app.models.user import User
from app.models.inventory import Product, Store, TradeClient
from app.schemas.distributor_schemas import (
    DistributorDirectoryEntryOut,
    DistributorListOut,
    DistributorProfileOut,
    DistributorProfileUpdate,
    DistributorSelfProfileOut,
    DistributorVerificationDecision,
)
from app.schemas.inventory_schemas import ProductOut, TradeOrderCreate, TradeOrderLineCreate, TradeOrderOut
from app.services.notification_service import NotificationService
from app.services.trade_credit_service import TradeCreditService
from app.services.trade_service import TradeOrderService

router = APIRouter()


@router.get("/me", response_model=DistributorSelfProfileOut)
def get_my_distributor_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile = db.execute(
        select(DistributorProfile).where(DistributorProfile.user_id == user_id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No distributor profile found for this account")
    return DistributorSelfProfileOut.model_validate(profile)


@router.put("/me", response_model=DistributorSelfProfileOut)
def update_my_distributor_profile(
    payload: DistributorProfileUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """A distributor editing their own operational details post-onboarding.
    Deliberately cannot touch cac_reg_number/verified — those require
    re-verification (POST /{id}/verify), not a silent self-edit."""
    profile = db.execute(
        select(DistributorProfile).where(DistributorProfile.user_id == user_id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No distributor profile found for this account")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return DistributorSelfProfileOut.model_validate(profile)


@router.post("/{distributor_user_id}/verify", response_model=DistributorSelfProfileOut)
def verify_distributor(
    distributor_user_id: str,
    payload: DistributorVerificationDecision,
    db: Session = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Admin-only approve/reject of a distributor's onboarding. This is the
    only code path that can ever set DistributorProfile.verified — without
    it, no distributor can appear in the buyer directory or receive orders
    (see GET / and POST /{id}/orders, both of which gate on verified=True)."""
    profile = db.execute(
        select(DistributorProfile).where(DistributorProfile.user_id == distributor_user_id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No distributor profile found for this account")

    profile.verified = payload.approve
    profile.verification_note = payload.note
    profile.verified_at = datetime.now(timezone.utc) if payload.approve else None
    db.commit()
    db.refresh(profile)

    NotificationService(db).create(
        user_id=distributor_user_id,
        type="distributor_verification",
        title="You're verified — start selling wholesale" if payload.approve else "Verification needs another look",
        message=payload.note or (
            "Your distributor account is verified. Buyers can now find you and order from your wholesale catalogue."
            if payload.approve else
            "We couldn't verify your distributor account yet. Check Settings for what's needed."
        ),
        related_entity_type="distributor_profile",
        related_entity_id=profile.id,
    )
    return DistributorSelfProfileOut.model_validate(profile)


@router.get("", response_model=DistributorListOut)
def list_distributors(
    verified_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    """Browse distributors a business owner can order from."""
    query = select(DistributorProfile, User.business_name).join(User, User.id == DistributorProfile.user_id)
    if verified_only:
        query = query.where(DistributorProfile.verified == True)  # noqa: E712

    rows = db.execute(query.offset(skip).limit(limit)).all()
    total = db.execute(
        select(DistributorProfile).where(DistributorProfile.verified == True) if verified_only
        else select(DistributorProfile)
    ).all()

    items = [
        DistributorDirectoryEntryOut.model_validate({**profile.__dict__, "business_name": business_name})
        for profile, business_name in rows
    ]
    return DistributorListOut(items=items, total=len(total))


@router.get("/trade-credit")
def get_my_trade_credit(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """The requesting user's own earned trade-credit ceiling (as a buyer)."""
    return TradeCreditService(db, user_id).get_credit_summary()


@router.get("/{distributor_user_id}/products", response_model=List[ProductOut])
def get_distributor_catalog(
    distributor_user_id: str,
    search: str = Query(None),
    db: Session = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    """Cross-tenant, read-only: only products the distributor opted into
    wholesale listing are visible here — never their full private catalog."""
    query = db.query(Product).filter(
        Product.owner_id == distributor_user_id,
        Product.is_wholesale_listed == True,  # noqa: E712
        Product.is_active == True,  # noqa: E712
    )
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    products = query.order_by(Product.name).all()
    return [ProductOut.model_validate(p) for p in products]


class DistributorOrderLineIn(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)


class DistributorOrderCreate(BaseModel):
    lines: List[DistributorOrderLineIn] = Field(..., min_length=1)


def _find_or_create_buyer_client(db: Session, distributor_user_id: str, buyer: User) -> TradeClient:
    client = (
        db.query(TradeClient)
        .filter(TradeClient.owner_id == distributor_user_id, TradeClient.linked_user_id == buyer.id)
        .first()
    )
    if client:
        return client
    client = TradeClient(
        owner_id=distributor_user_id,
        linked_user_id=buyer.id,
        company_name=buyer.business_name or buyer.full_name or buyer.phone,
        contact_phone=buyer.phone,
        contact_email=buyer.email,
    )
    db.add(client)
    db.flush()
    return client


@router.post("/{distributor_user_id}/orders", response_model=TradeOrderOut, status_code=201)
def create_distributor_order(
    distributor_user_id: str,
    payload: DistributorOrderCreate = Body(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    A business owner orders from a distributor's wholesale-listed catalog,
    gated by the buyer's own trade-credit ceiling. Reuses TradeOrderService's
    existing draft state machine — the only new logic here is the cross-tenant
    credit check and the buyer/distributor linkage.
    """
    if distributor_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot place a distributor order against your own catalog")

    buyer = db.execute(
        select(User).where(User.id == user_id).with_for_update()
    ).scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer account not found")

    distributor_profile = db.execute(
        select(DistributorProfile).where(
            DistributorProfile.user_id == distributor_user_id,
            DistributorProfile.verified == True,  # noqa: E712
        )
    ).scalar_one_or_none()
    if not distributor_profile:
        raise HTTPException(status_code=404, detail="Distributor not found or not yet verified")

    store = db.query(Store).filter(Store.owner_id == distributor_user_id).order_by(Store.is_primary.desc()).first()
    if not store:
        raise HTTPException(status_code=422, detail="This distributor has no store set up yet")

    order_total_kobo = sum(line.quantity * line.unit_price_kobo for line in payload.lines)

    credit = TradeCreditService(db, user_id).get_credit_summary()
    if order_total_kobo > credit["trade_credit_available_kobo"]:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Order total NGN {order_total_kobo / 100:,.0f} exceeds your available trade credit of "
                f"NGN {credit['trade_credit_available_kobo'] / 100:,.0f} "
                f"(limit NGN {credit['trade_credit_limit_kobo'] / 100:,.0f}, "
                f"already committed NGN {credit['trade_credit_in_use_kobo'] / 100:,.0f})."
            ),
        )

    client = _find_or_create_buyer_client(db, distributor_user_id, buyer)

    order_service = TradeOrderService(db, distributor_user_id)
    try:
        order = order_service.create_order(
            TradeOrderCreate(
                client_id=client.id,
                store_id=store.id,
                payment_terms="net30",
                lines=[
                    TradeOrderLineCreate(product_id=line.product_id, quantity=line.quantity, unit_price_kobo=line.unit_price_kobo)
                    for line in payload.lines
                ],
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    order_row = order_service.get_order(order.id)
    order_row.buyer_owner_id = user_id
    db.commit()

    line_summaries = [
        {"product_id": line.product_id, "quantity": line.quantity, "unit_price_kobo": line.unit_price_kobo}
        for line in payload.lines
    ]
    NotificationService(db).create(
        user_id=distributor_user_id,
        type="order_request",
        title=f"New order from {buyer.business_name or buyer.full_name or buyer.phone}",
        message=f"{len(payload.lines)} item(s) requested, totalling NGN {order_total_kobo / 100:,.0f}.",
        related_entity_type="trade_order",
        related_entity_id=order.id,
        metadata={"lines": line_summaries, "total_kobo": order_total_kobo},
    )

    return order_service.get_order_out(order.id)

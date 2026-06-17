"""
Goal-Based Product Savings — save toward product units, not naira amounts.

Target stored as product_id + quantity. Naira value computed at read-time
from current product price for inflation protection.

Prefix: /v1/product-savings
Tags:   product-savings
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.inventory import Product
from app.models.product_savings import ProductSavingsGoal, ProductSavingsDeposit


router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GoalCreateIn(BaseModel):
    product_id: str
    target_quantity: int = Field(..., gt=0)


class GoalOut(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_unit: str
    product_image_url: Optional[str] = None
    target_quantity: int
    current_price_kobo: int
    target_amount_kobo: int
    saved_kobo: int
    progress_pct: float
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DepositIn(BaseModel):
    amount_kobo: int = Field(..., gt=0)


class DepositOut(BaseModel):
    deposit_id: str
    goal_id: str
    amount_kobo: int
    new_saved_kobo: int
    new_progress_pct: float
    is_completed: bool
    message: str


def _build_goal_out(goal: ProductSavingsGoal, product: Product) -> GoalOut:
    target_kobo = product.selling_price_kobo * goal.target_quantity
    progress = round((goal.saved_kobo / target_kobo * 100) if target_kobo > 0 else 0, 1)
    return GoalOut(
        id=goal.id,
        product_id=product.id,
        product_name=product.name,
        product_unit=product.unit_of_measure,
        product_image_url=product.image_url,
        target_quantity=goal.target_quantity,
        current_price_kobo=product.selling_price_kobo,
        target_amount_kobo=target_kobo,
        saved_kobo=goal.saved_kobo,
        progress_pct=min(progress, 100.0),
        status=goal.status,
        created_at=goal.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/goals", response_model=GoalOut)
def create_product_goal(
    payload: GoalCreateIn,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    product = db.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    goal = ProductSavingsGoal(
        user_id=user_id,
        product_id=payload.product_id,
        target_quantity=payload.target_quantity,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return _build_goal_out(goal, product)


@router.get("/goals", response_model=List[GoalOut])
def list_product_goals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    q = select(ProductSavingsGoal).where(ProductSavingsGoal.user_id == user_id)
    if status:
        q = q.where(ProductSavingsGoal.status == status)
    q = q.order_by(ProductSavingsGoal.created_at.desc())

    goals = db.execute(q).scalars().all()
    out = []
    for g in goals:
        product = db.get(Product, g.product_id)
        if product:
            out.append(_build_goal_out(g, product))
    return out


@router.get("/goals/{goal_id}", response_model=GoalOut)
def get_product_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    goal = db.get(ProductSavingsGoal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    product = db.get(Product, goal.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product no longer exists")
    return _build_goal_out(goal, product)


@router.post("/goals/{goal_id}/deposit", response_model=DepositOut)
def deposit_to_goal(
    goal_id: str,
    payload: DepositIn,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    goal = db.get(ProductSavingsGoal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.status != "active":
        raise HTTPException(status_code=400, detail="Goal is not active")

    product = db.get(Product, goal.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product no longer exists")

    deposit = ProductSavingsDeposit(
        goal_id=goal_id,
        user_id=user_id,
        amount_kobo=payload.amount_kobo,
    )
    db.add(deposit)

    goal.saved_kobo += payload.amount_kobo

    target_kobo = product.selling_price_kobo * goal.target_quantity
    is_completed = goal.saved_kobo >= target_kobo
    if is_completed:
        goal.status = "completed"
        goal.completed_at = datetime.now(timezone.utc)

    db.commit()

    progress = round((goal.saved_kobo / target_kobo * 100) if target_kobo > 0 else 0, 1)

    return DepositOut(
        deposit_id=deposit.id,
        goal_id=goal_id,
        amount_kobo=payload.amount_kobo,
        new_saved_kobo=goal.saved_kobo,
        new_progress_pct=min(progress, 100.0),
        is_completed=is_completed,
        message="Goal completed! You can now redeem your products." if is_completed else f"Deposit successful. {progress}% of target reached.",
    )

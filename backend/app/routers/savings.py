"""Savings router for autosweep, settlement, and bucket progress."""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.middleware.security import get_current_user, limiter
from app.services import savings_service as svc

router = APIRouter(prefix="/savings", tags=["savings"])


class ManualDepositRequest(BaseModel):
    goal_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)


class GatewayWebhookRequest(BaseModel):
    reference_code: str
    partner_commission: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


@router.get("/buckets/progress")
@limiter.limit("120/minute")
def bucket_progress(
    request: Request,
    user_id: UUID = Depends(get_current_user),
) -> list[dict]:
    return svc.get_bucket_progress(user_id)


@router.post("/deposits/manual", status_code=201)
@limiter.limit("30/minute")
def create_manual_deposit(
    request: Request,
    payload: ManualDepositRequest,
    user_id: UUID = Depends(get_current_user),
) -> dict:
    return svc.create_manual_deposit(user_id, payload.goal_id, payload.amount)


@router.post("/deposits/confirm")
@limiter.limit("120/minute")
def confirm_gateway_deposit(
    request: Request,
    payload: GatewayWebhookRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """Gateway webhook entrypoint. Settlement is delegated in background task."""
    def _settle() -> None:
        svc.settle_confirmed_deposit(payload.reference_code, payload.partner_commission)

    background_tasks.add_task(_settle)
    return {"accepted": True, "reference_code": payload.reference_code}


@router.get("/auto-sweep/run")
@limiter.limit("10/minute")
def run_auto_sweep_now(
    request: Request,
) -> dict:
    return svc.run_auto_sweep_cycle()


@router.get("/suggestions/inventory")
@limiter.limit("120/minute")
def inventory_smart_suggestion(
    request: Request,
    profit_delta: Decimal = Query(..., gt=0),
    user_id: UUID = Depends(get_current_user),
) -> dict:
    suggestion = svc.generate_smart_suggestion(str(user_id), profit_delta)
    if not suggestion:
        raise HTTPException(status_code=404, detail="No active goal to suggest against")
    return suggestion

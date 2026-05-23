from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.savings_service import SavingsService
from app.schemas.savings_schemas import (
    SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse,
    SavingsTransactionCreate, SavingsTransactionResponse,
    SavingsDashboardResponse
)
from app.infrastructure.auth import get_current_user_id

router = APIRouter()

@router.post("/goals", response_model=SavingsGoalResponse)
def create_savings_goal(
    payload: SavingsGoalCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    return service.create_goal(payload)

@router.get("/goals", response_model=List[SavingsGoalResponse])
def list_savings_goals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    return service.get_goals(status)

@router.get("/goals/{goal_id}", response_model=SavingsGoalResponse)
def get_savings_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    goal = service.get_goal_by_id(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.patch("/goals/{goal_id}", response_model=SavingsGoalResponse)
def update_savings_goal(
    goal_id: str,
    payload: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    goal = service.update_goal(goal_id, payload)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.post("/transactions", response_model=SavingsTransactionResponse)
def record_savings_transaction(
    payload: SavingsTransactionCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    try:
        return service.record_transaction(payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dashboard", response_model=SavingsDashboardResponse)
def get_savings_dashboard(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    return service.get_dashboard()

@router.get("/suggest", response_model=dict)
def get_savings_suggestion(
    sales_transaction_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    service = SavingsService(db, user_id)
    suggestion = service.suggest_savings(sales_transaction_id)
    if not suggestion:
        return {"suggest": False}
    return {"suggest": True, "data": suggestion}

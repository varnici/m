"""Budget_Best API endpoints."""
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import date

from app.models.budget_best import (
    SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse,
    SavingsTransactionCreate, SavingsTransactionResponse,
    ReminderSettingsCreate, ReminderSettingsUpdate, ReminderSettingsResponse,
    SavingsStreakResponse,
    AutoSweepSettingsCreate, AutoSweepSettingsUpdate, AutoSweepSettingsResponse,
    BudgetBucketCreate, BudgetBucketUpdate, BudgetBucketResponse,
    SavingsDashboard,
    PolicyConsentResponse,
)
from app.services import budget_best_service as svc
from app.middleware.security import limiter, get_current_user
from fastapi import Request

router = APIRouter(prefix="/budget-best", tags=["budget-best"])


# ===================== SAVINGS GOALS =====================

@router.post("/goals", response_model=SavingsGoalResponse, status_code=201)
@limiter.limit("30/minute")
def create_goal(
    request: Request,
    payload: SavingsGoalCreate,
    user_id: UUID = Depends(get_current_user),
) -> SavingsGoalResponse:
    """Create a new savings goal."""
    try:
        if payload.daily_target and payload.daily_target <= 0:
            raise HTTPException(400, detail="daily_target must be positive")
        return svc.create_savings_goal(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("/goals", response_model=list[SavingsGoalResponse])
@limiter.limit("60/minute")
def list_goals(
    request: Request,
    user_id: UUID = Depends(get_current_user),
    only_active: bool = Query(True),
) -> list[SavingsGoalResponse]:
    """List all savings goals."""
    return svc.list_savings_goals(user_id, only_active=only_active)


@router.get("/goals/{goal_id}", response_model=SavingsGoalResponse)
@limiter.limit("120/minute")
def get_goal(
    request: Request,
    goal_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> SavingsGoalResponse:
    """Get a single savings goal."""
    goal = svc.get_savings_goal(goal_id, user_id)
    if not goal:
        raise HTTPException(404, detail="Goal not found")
    return goal


@router.patch("/goals/{goal_id}", response_model=SavingsGoalResponse)
@limiter.limit("30/minute")
def update_goal(
    request: Request,
    goal_id: UUID,
    payload: SavingsGoalUpdate,
    user_id: UUID = Depends(get_current_user),
) -> SavingsGoalResponse:
    """Update a savings goal."""
    goal = svc.update_savings_goal(goal_id, user_id, payload)
    if not goal:
        raise HTTPException(404, detail="Goal not found")
    return goal


@router.delete("/goals/{goal_id}", status_code=204)
@limiter.limit("15/minute")
def delete_goal(
    request: Request,
    goal_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> None:
    """Delete a savings goal."""
    goal = svc.get_savings_goal(goal_id, user_id)
    if not goal:
        raise HTTPException(404, detail="Goal not found")
    # Soft delete: set is_active to False
    svc.update_savings_goal(goal_id, user_id, SavingsGoalUpdate(is_active=False))


# ===================== TRANSACTIONS =====================

@router.post("/transactions", response_model=SavingsTransactionResponse, status_code=201)
@limiter.limit("60/minute")
def record_transaction(
    request: Request,
    payload: SavingsTransactionCreate,
    user_id: UUID = Depends(get_current_user),
) -> SavingsTransactionResponse:
    """Record a savings transaction."""
    try:
        # Verify goal belongs to user
        goal = svc.get_savings_goal(payload.goal_id, user_id)
        if not goal:
            raise HTTPException(404, detail="Goal not found")
        
        return svc.record_transaction(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("/transactions/goal/{goal_id}", response_model=list[SavingsTransactionResponse])
@limiter.limit("60/minute")
def list_transactions(
    request: Request,
    goal_id: UUID,
    user_id: UUID = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[SavingsTransactionResponse]:
    """List transactions for a goal."""
    goal = svc.get_savings_goal(goal_id, user_id)
    if not goal:
        raise HTTPException(404, detail="Goal not found")
    
    return svc.get_goal_transactions(goal_id, user_id, limit=limit, offset=offset)


# ===================== REMINDERS =====================

@router.post("/reminders", response_model=ReminderSettingsResponse, status_code=201)
@limiter.limit("30/minute")
def create_reminder(
    request: Request,
    payload: ReminderSettingsCreate,
    user_id: UUID = Depends(get_current_user),
) -> ReminderSettingsResponse:
    """Create reminder settings."""
    try:
        goal = svc.get_savings_goal(payload.goal_id, user_id)
        if not goal:
            raise HTTPException(404, detail="Goal not found")
        
        return svc.create_reminder_settings(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.patch("/reminders/{reminder_id}", response_model=ReminderSettingsResponse)
@limiter.limit("30/minute")
def update_reminder(
    request: Request,
    reminder_id: UUID,
    payload: ReminderSettingsUpdate,
    user_id: UUID = Depends(get_current_user),
) -> ReminderSettingsResponse:
    """Update reminder settings."""
    reminder = svc.update_reminder_settings(reminder_id, user_id, payload)
    if not reminder:
        raise HTTPException(404, detail="Reminder not found")
    return reminder


# ===================== STREAKS =====================

@router.get("/streak", response_model=SavingsStreakResponse)
@limiter.limit("120/minute")
def get_streak(
    request: Request,
    user_id: UUID = Depends(get_current_user),
) -> SavingsStreakResponse:
    """Get user's savings streak."""
    streak = svc.get_user_streak(user_id)
    if not streak:
        raise HTTPException(404, detail="Streak not found")
    return streak


# ===================== AUTO-SWEEP =====================

@router.post("/auto-sweep", response_model=AutoSweepSettingsResponse, status_code=201)
@limiter.limit("30/minute")
def create_auto_sweep(
    request: Request,
    payload: AutoSweepSettingsCreate,
    user_id: UUID = Depends(get_current_user),
) -> AutoSweepSettingsResponse:
    """Create auto-sweep settings."""
    try:
        goal = svc.get_savings_goal(payload.goal_id, user_id)
        if not goal:
            raise HTTPException(404, detail="Goal not found")
        
        return svc.create_auto_sweep(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("/auto-sweep/{sweep_id}", response_model=AutoSweepSettingsResponse)
@limiter.limit("120/minute")
def get_auto_sweep(
    request: Request,
    sweep_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> AutoSweepSettingsResponse:
    """Get auto-sweep settings."""
    sweep = svc.get_auto_sweep(sweep_id, user_id)
    if not sweep:
        raise HTTPException(404, detail="Auto-sweep settings not found")
    return sweep


# ===================== BUDGET BUCKETS =====================

@router.post("/buckets", response_model=BudgetBucketResponse, status_code=201)
@limiter.limit("30/minute")
def create_bucket(
    request: Request,
    payload: BudgetBucketCreate,
    user_id: UUID = Depends(get_current_user),
) -> BudgetBucketResponse:
    """Create a budget bucket."""
    try:
        return svc.create_bucket(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.get("/buckets", response_model=list[BudgetBucketResponse])
@limiter.limit("60/minute")
def list_buckets(
    request: Request,
    user_id: UUID = Depends(get_current_user),
) -> list[BudgetBucketResponse]:
    """List all budget buckets."""
    return svc.list_buckets(user_id)


# ===================== DASHBOARD =====================

@router.get("/dashboard", response_model=SavingsDashboard)
@limiter.limit("60/minute")
def get_dashboard(
    request: Request,
    user_id: UUID = Depends(get_current_user),
) -> SavingsDashboard:
    """Get complete savings dashboard."""
    return svc.get_savings_dashboard(user_id)


# ===================== POLICY =====================

@router.get("/policy", response_model=PolicyConsentResponse)
@limiter.limit("60/minute")
def get_policy(
    request: Request,
    user_id: UUID = Depends(get_current_user),
    version: str = Query("1.0"),
) -> PolicyConsentResponse:
    """Get or create policy consent."""
    return svc.get_or_create_policy(user_id, version)


@router.post("/policy/{policy_id}/accept", response_model=PolicyConsentResponse)
@limiter.limit("10/minute")
def accept_policy(
    request: Request,
    policy_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> PolicyConsentResponse:
    """Accept policy."""
    try:
        return svc.accept_policy(user_id, policy_id)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


# ===================== HEALTH CHECK =====================

@router.get("/health", tags=["Health"])
@limiter.limit("300/minute")
async def budget_best_health(request: Request):
    """Health check for Budget_Best service."""
    return {"status": "ok", "service": "budget-best"}

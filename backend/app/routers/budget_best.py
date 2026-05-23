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


@router.get("/reminders/goal/{goal_id}", response_model=ReminderSettingsResponse)
@limiter.limit("60/minute")
def get_reminder_for_goal(
    request: Request,
    goal_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> ReminderSettingsResponse:
    """Get reminder settings for a goal."""
    reminder = svc.get_reminder_by_goal(goal_id, user_id)
    if not reminder:
        raise HTTPException(404, detail="Reminder settings not found")
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


@router.get("/auto-sweep/goal/{goal_id}", response_model=AutoSweepSettingsResponse)
@limiter.limit("60/minute")
def get_auto_sweep_for_goal(
    request: Request,
    goal_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> AutoSweepSettingsResponse:
    """Get auto-sweep settings for a specific goal."""
    sweep = svc.get_auto_sweep_by_goal(goal_id, user_id)
    if not sweep:
        raise HTTPException(404, detail="Auto-sweep settings not found")
    return sweep


@router.patch("/auto-sweep/{sweep_id}", response_model=AutoSweepSettingsResponse)
@limiter.limit("30/minute")
def update_auto_sweep(
    request: Request,
    sweep_id: UUID,
    payload: AutoSweepSettingsUpdate,
    user_id: UUID = Depends(get_current_user),
) -> AutoSweepSettingsResponse:
    """Update auto-sweep settings."""
    sweep = svc.update_auto_sweep(sweep_id, user_id, payload)
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

import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

LIVE_POLICY_FEED_URL = "https://raw.githubusercontent.com/paulji-peters/ventureroot-policy/main/policy.txt"


class PolicyConsentExtendedResponse(PolicyConsentResponse):
    """Extended policy consent response including the actual terms text."""
    policy_content: str


def fetch_live_policy_content() -> str:
    """
    Fetch the latest policy terms from a live public feed, with zero-loss guarantee fallback.
    """
    try:
        # Fetch with a short timeout to prevent slow gateway responses
        with httpx.Client(timeout=3.0) as client:
            res = client.get(LIVE_POLICY_FEED_URL)
            if res.status_code == 200:
                return res.text.strip()
    except Exception as e:
        logger.warning(f"Failed to fetch live policy content: {e}. Falling back to default terms.")
    
    # Static fallback (zero-loss savings guarantee terms)
    return """
    BUDGET_BEST: ZERO-LOSS SAVINGS GUARANTEE
    
    Effective Date: January 1, 2024
    Version: 1.0
    
    1. THE BUDGET_BEST GUARANTEE
    We believe in 1:1 value. Every amount you save is yours. 
    Your savings are protected and cannot be reduced by management fees.
    
    Example: If you save ₦200 daily for 30 days, you will receive ₦6,000 
    at the month's end, regardless of fees.
    
    2. HOW WE COVER COSTS
    Our operational costs are covered through:
    - A transparent 1% annual interest earned on aggregated savings
    - Optional premium features (premium reminders, advanced analytics)
    - No deduction from your principal savings amount
    
    3. YOUR SAVINGS ARE YOURS
    - 100% of your daily deposits go to your savings
    - Interest earned helps sustain the platform
    - You can withdraw anytime (subject to active goals)
    
    4. DATA SECURITY
    - All transactions encrypted with industry-standard SSL
    - Your data is protected under banking-grade security standards
    - Regular security audits by third-party professionals
    
    5. TERMS
    - Minimum daily deposit: ₦100
    - Maximum monthly goal: ₦500,000
    - Savings are held in trust with Tier-1 Banks
    
    By accepting these terms, you understand and agree to Budget_Best's 
    savings guarantee and data protection policies.
    """.strip()


@router.get("/policy", response_model=PolicyConsentExtendedResponse)
@limiter.limit("60/minute")
def get_policy(
    request: Request,
    user_id: UUID = Depends(get_current_user),
    version: str = Query("1.0"),
) -> PolicyConsentExtendedResponse:
    """Get or create policy consent, including terms from live feed."""
    consent = svc.get_or_create_policy(user_id, version)
    policy_text = fetch_live_policy_content()
    
    return PolicyConsentExtendedResponse(
        id=consent.id,
        user_id=consent.user_id,
        policy_version=consent.policy_version,
        accepted=consent.accepted,
        accepted_at=consent.accepted_at,
        created_at=consent.created_at,
        policy_content=policy_text
    )


@router.post("/policy/{policy_id}/accept", response_model=PolicyConsentExtendedResponse)
@limiter.limit("10/minute")
def accept_policy(
    request: Request,
    policy_id: UUID,
    user_id: UUID = Depends(get_current_user),
) -> PolicyConsentExtendedResponse:
    """Accept policy and return updated state with terms."""
    try:
        consent = svc.accept_policy(user_id, policy_id)
        policy_text = fetch_live_policy_content()
        
        return PolicyConsentExtendedResponse(
            id=consent.id,
            user_id=consent.user_id,
            policy_version=consent.policy_version,
            accepted=consent.accepted,
            accepted_at=consent.accepted_at,
            created_at=consent.created_at,
            policy_content=policy_text
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


# ===================== INTELLIGENCE =====================

RAG_SERVICE_URL = "http://rag-service:8003/v1"


@router.get("/intelligence/market-ticker", tags=["Intelligence"])
@limiter.limit("60/minute")
def get_market_ticker(request: Request):
    """
    Get live-simulated market tickers. Proxies to RAG service or falls back to simulated feed.
    """
    try:
        with httpx.Client(timeout=3.0) as client:
            res = client.get(f"{RAG_SERVICE_URL}/intelligence/market-ticker")
            if res.status_code == 200:
                return res.json()
    except Exception as e:
        logger.warning(f"Failed to fetch market ticker from RAG service: {e}. Simulating fallback.")
    
    # Direct simulation fallback
    import random
    base_prices = {"AG": 20.50, "Zenith": 36.15, "Airtel": 2200.00, "NGX ASI": 98450.20}
    tickers = []
    for symbol, base_price in base_prices.items():
        change = random.uniform(-2.0, 3.0)
        positive = change >= 0
        new_price = base_price * (1 + change / 100)
        price_str = f"₦{new_price:,.2f}" if symbol != "NGX ASI" else f"{new_price:,.2f}"
        tickers.append({
            "symbol": symbol,
            "price": price_str,
            "change": f"{'+' if positive else ''}{change:.2f}%",
            "positive": positive
        })
    return tickers


@router.get("/intelligence/articles", tags=["Intelligence"])
@limiter.limit("60/minute")
def get_articles(
    request: Request,
    category: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get latest articles and trade alerts. Proxies to RAG service or falls back to curated alerts.
    """
    try:
        with httpx.Client(timeout=3.0) as client:
            res = client.get(
                f"{RAG_SERVICE_URL}/intelligence/articles",
                params={"category": category, "limit": limit}
            )
            if res.status_code == 200:
                return res.json()
    except Exception as e:
        logger.warning(f"Failed to fetch articles from RAG service: {e}. Using fallback.")
    
    # Fallback curated articles list
    from datetime import datetime, timezone
    fallback_articles = [
        {
            "id": "e0b51fa1-e63d-4c38-89c5-115f013d528b",
            "category": "Trade Alert",
            "source": "VR Insights",
            "headline": "Dangote Flour drops 8% — best time to restock for Q1",
            "subtitle": "↑ Buy opportunity for provisions sellers.",
            "published_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "a576b5cf-79fd-42b7-bdc6-778918237e1b",
            "category": "CBN Update",
            "source": "BusinessDay NG",
            "headline": "CBN increases interest rate to 26.25% to curb inflation",
            "subtitle": "Savings rates set to rise.",
            "published_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    if category:
        fallback_articles = [a for a in fallback_articles if a["category"].lower() == category.lower()]
    return fallback_articles[:limit]


# ===================== HEALTH CHECK =====================

@router.get("/health", tags=["Health"])
@limiter.limit("300/minute")
async def budget_best_health(request: Request):
    """Health check for Budget_Best service."""
    return {"status": "ok", "service": "budget-best"}


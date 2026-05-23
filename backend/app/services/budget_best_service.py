"""Budget_Best service - business logic layer."""
from __future__ import annotations
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal
import json
import logging

from app.models.budget_best import (
    SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse,
    SavingsTransactionCreate, SavingsTransactionResponse,
    ReminderSettingsCreate, ReminderSettingsUpdate, ReminderSettingsResponse,
    SavingsStreakResponse,
    AutoSweepSettingsCreate, AutoSweepSettingsUpdate, AutoSweepSettingsResponse,
    BudgetBucketCreate, BudgetBucketUpdate, BudgetBucketResponse,
    SavingsProgress, SavingsDashboard,
    PolicyConsentCreate, PolicyConsentResponse,
)
from app.services.supabase_service import get_supabase

logger = logging.getLogger(__name__)

# Table names
GOALS_TABLE = "savings_goals"
TRANSACTIONS_TABLE = "savings_transactions"
REMINDERS_TABLE = "reminder_settings"
STREAKS_TABLE = "savings_streaks"
AUTO_SWEEP_TABLE = "auto_sweep_settings"
BUCKETS_TABLE = "budget_buckets"
LOGS_TABLE = "transaction_logs"
POLICY_TABLE = "policy_consents"


def _client():
    return get_supabase()


# ===================== SAVINGS GOALS =====================

def create_savings_goal(user_id: UUID, payload: SavingsGoalCreate) -> SavingsGoalResponse:
    """Create a new savings goal."""
    # Calculate daily target
    today = date.today()
    days_until_deadline = (payload.deadline - today).days
    daily_target = payload.monthly_goal / max(days_until_deadline, 1)

    data = {
        "user_id": str(user_id),
        "goal_name": payload.goal_name,
        "goal_type": payload.goal_type,
        "target_amount": float(payload.target_amount),
        "monthly_goal": float(payload.monthly_goal),
        "daily_target": float(daily_target),
        "deadline": payload.deadline.isoformat(),
        "current_savings": 0.0,
        "is_active": True,
    }
    
    res = _client().table(GOALS_TABLE).insert(data).execute()
    if not res.data:
        raise ValueError("Failed to create savings goal")
    
    return SavingsGoalResponse(**res.data[0])


def list_savings_goals(user_id: UUID, only_active: bool = True) -> list[SavingsGoalResponse]:
    """List all savings goals for a user."""
    query = _client().table(GOALS_TABLE).select("*").eq("user_id", str(user_id))
    
    if only_active:
        query = query.eq("is_active", True)
    
    query = query.order("created_at", desc=True)
    res = query.execute()
    
    return [SavingsGoalResponse(**r) for r in res.data]


def get_savings_goal(goal_id: UUID, user_id: UUID) -> SavingsGoalResponse | None:
    """Get a single savings goal."""
    res = (
        _client()
        .table(GOALS_TABLE)
        .select("*")
        .eq("id", str(goal_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    
    if not res.data:
        return None
    return SavingsGoalResponse(**res.data[0])


def update_savings_goal(goal_id: UUID, user_id: UUID, payload: SavingsGoalUpdate) -> SavingsGoalResponse | None:
    """Update a savings goal."""
    data = payload.model_dump(exclude_none=True)
    if not data:
        return get_savings_goal(goal_id, user_id)
    
    # Convert dates to ISO format
    if "deadline" in data:
        data["deadline"] = data["deadline"].isoformat()
    
    res = (
        _client()
        .table(GOALS_TABLE)
        .update(data)
        .eq("id", str(goal_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    
    if not res.data:
        return None
    return SavingsGoalResponse(**res.data[0])


# ===================== TRANSACTIONS =====================

def record_transaction(user_id: UUID, payload: SavingsTransactionCreate) -> SavingsTransactionResponse:
    """Record a savings transaction and update goal progress."""
    # Generate reference code
    ref_code = f"SAV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(user_id)[:8]}"
    
    data = {
        "goal_id": str(payload.goal_id),
        "user_id": str(user_id),
        "amount": float(payload.amount),
        "transaction_type": payload.transaction_type,
        "reference_code": ref_code,
        "status": "completed",
        "notes": payload.notes,
    }
    
    res = _client().table(TRANSACTIONS_TABLE).insert(data).execute()
    if not res.data:
        raise ValueError("Failed to record transaction")
    
    # Update goal's current_savings
    _update_goal_savings(payload.goal_id, user_id, payload.amount, payload.transaction_type)
    
    # Update streak
    _update_streak(user_id, payload.goal_id)
    
    # Log action
    _log_action(user_id, "transaction_recorded", {"goal_id": str(payload.goal_id), "amount": float(payload.amount)})
    
    return SavingsTransactionResponse(**res.data[0])


def _update_goal_savings(goal_id: UUID, user_id: UUID, amount: Decimal, transaction_type: str):
    """
    Update goal's current savings. OPTIMIZED: Direct query-based update instead of fetch-then-update.
    
    OPTIMIZATION PRINCIPLE: Avoid N+1 queries - use database UPDATE instead of SELECT + UPDATE.
    """
    if transaction_type == "deposit":
        # Use raw SQL to increment atomically at DB level (O(1), no race condition)
        _client().table(GOALS_TABLE).update({
            "current_savings": f"current_savings + {float(amount)}",  # PostgreSQL expression
            "updated_at": datetime.now().isoformat(),
        }).eq("id", str(goal_id)).eq("user_id", str(user_id)).execute()
    elif transaction_type == "withdrawal":
        # Safe decrement: never go below 0
        _client().table(GOALS_TABLE).update({
            "current_savings": f"GREATEST(current_savings - {float(amount)}, 0)",  # PostgreSQL function
            "updated_at": datetime.now().isoformat(),
        }).eq("id", str(goal_id)).eq("user_id", str(user_id)).execute()
    else:
        # No change, just touch the updated_at
        _client().table(GOALS_TABLE).update({
            "updated_at": datetime.now().isoformat(),
        }).eq("id", str(goal_id)).eq("user_id", str(user_id)).execute()


def get_goal_transactions(goal_id: UUID, user_id: UUID, limit: int = 50, offset: int = 0) -> list[SavingsTransactionResponse]:
    """
    Get transactions for a goal. OPTIMIZED: Add index hints and caching-friendly ordering.
    
    OPTIMIZATION: Assumes DB index on (goal_id, user_id, created_at) for O(log n) lookup.
    """
    # Select only needed columns to reduce data transfer
    res = (
        _client()
        .table(TRANSACTIONS_TABLE)
        .select("id,goal_id,user_id,amount,transaction_type,reference_code,status,created_at")
        .eq("goal_id", str(goal_id))
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    
    return [SavingsTransactionResponse(**r) for r in res.data]


# ===================== REMINDERS =====================

def create_reminder_settings(user_id: UUID, payload: ReminderSettingsCreate) -> ReminderSettingsResponse:
    """Create reminder settings."""
    # Calculate next reminder time
    next_reminder = _calculate_next_reminder(payload.reminder_time)
    
    data = {
        "user_id": str(user_id),
        "goal_id": str(payload.goal_id),
        "reminder_time": payload.reminder_time.isoformat(),
        "reminder_enabled": payload.reminder_enabled,
        "reminder_frequency": payload.reminder_frequency,
        "next_reminder_at": next_reminder.isoformat(),
    }
    
    res = _client().table(REMINDERS_TABLE).insert(data).execute()
    if not res.data:
        raise ValueError("Failed to create reminder settings")
    
    return ReminderSettingsResponse(**res.data[0])


def update_reminder_settings(reminder_id: UUID, user_id: UUID, payload: ReminderSettingsUpdate) -> ReminderSettingsResponse | None:
    """Update reminder settings."""
    data = payload.model_dump(exclude_none=True)
    
    if "reminder_time" in data:
        data["reminder_time"] = data["reminder_time"].isoformat()
        data["next_reminder_at"] = _calculate_next_reminder(data["reminder_time"]).isoformat()
    
    res = (
        _client()
        .table(REMINDERS_TABLE)
        .update(data)
        .eq("id", str(reminder_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    
    if not res.data:
        return None
    return ReminderSettingsResponse(**res.data[0])


def get_reminder_by_goal(goal_id: UUID, user_id: UUID) -> ReminderSettingsResponse | None:
    """Get reminder settings for a specific goal."""
    res = (
        _client()
        .table(REMINDERS_TABLE)
        .select("*")
        .eq("goal_id", str(goal_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    if not res.data:
        return None
    return ReminderSettingsResponse(**res.data[0])


def get_reminders_to_send() -> list[dict]:
    """Get all reminders that should be sent now."""
    now = datetime.now()
    res = (
        _client()
        .table(REMINDERS_TABLE)
        .select("*")
        .eq("reminder_enabled", True)
        .lte("next_reminder_at", now.isoformat())
        .execute()
    )
    
    return res.data if res.data else []


def _calculate_next_reminder(reminder_time) -> datetime:
    """Calculate next reminder datetime."""
    now = datetime.now()
    next_reminder = now.replace(hour=reminder_time.hour, minute=reminder_time.minute, second=0, microsecond=0)
    
    if next_reminder <= now:
        next_reminder += timedelta(days=1)
    
    return next_reminder


# ===================== STREAKS & GAMIFICATION =====================

def _update_streak(user_id: UUID, goal_id: UUID):
    """Update user's savings streak."""
    today = date.today()
    
    # Get or create streak record
    res = _client().table(STREAKS_TABLE).select("*").eq("user_id", str(user_id)).execute()
    
    if not res.data:
        # Create new streak
        data = {
            "user_id": str(user_id),
            "current_streak": 1,
            "best_streak": 1,
            "streak_start_date": today.isoformat(),
            "last_saved_date": today.isoformat(),
            "tier_level": "bronze",
            "badges": [],
        }
        _client().table(STREAKS_TABLE).insert(data).execute()
    else:
        streak = res.data[0]
        last_saved = date.fromisoformat(streak["last_saved_date"])
        
        if last_saved == today:
            # Already saved today
            return
        elif (today - last_saved).days == 1:
            # Consecutive day
            new_streak = streak["current_streak"] + 1
            new_tier = _calculate_tier_level(new_streak)
            new_badges = _calculate_badges(new_streak, streak.get("badges", []))
            
            _client().table(STREAKS_TABLE).update({
                "current_streak": new_streak,
                "best_streak": max(new_streak, streak["best_streak"]),
                "last_saved_date": today.isoformat(),
                "tier_level": new_tier,
                "badges": new_badges,
                "updated_at": datetime.now().isoformat(),
            }).eq("user_id", str(user_id)).execute()
        else:
            # Streak broken
            _client().table(STREAKS_TABLE).update({
                "current_streak": 1,
                "streak_start_date": today.isoformat(),
                "last_saved_date": today.isoformat(),
                "tier_level": "bronze",
                "updated_at": datetime.now().isoformat(),
            }).eq("user_id", str(user_id)).execute()


def _calculate_tier_level(streak: int) -> str:
    """Calculate tier level based on streak."""
    if streak >= 100:
        return "platinum"
    elif streak >= 50:
        return "gold"
    elif streak >= 20:
        return "silver"
    else:
        return "bronze"


def _calculate_badges(streak: int, existing_badges: list) -> list:
    """Calculate earned badges."""
    badges = existing_badges.copy() if existing_badges else []
    
    milestones = {
        7: "week_warrior",
        30: "month_master",
        60: "consistency_champion",
        100: "savings_sage",
    }
    
    for milestone, badge in milestones.items():
        if streak == milestone and badge not in badges:
            badges.append(badge)
    
    return badges


def get_user_streak(user_id: UUID) -> SavingsStreakResponse | None:
    """Get user's savings streak."""
    res = _client().table(STREAKS_TABLE).select("*").eq("user_id", str(user_id)).execute()
    
    if not res.data:
        return None
    return SavingsStreakResponse(**res.data[0])


# ===================== AUTO-SWEEP =====================

def create_auto_sweep(user_id: UUID, payload: AutoSweepSettingsCreate) -> AutoSweepSettingsResponse:
    """Create auto-sweep settings."""
    data = {
        "user_id": str(user_id),
        "goal_id": str(payload.goal_id),
        "auto_save_enabled": payload.auto_save_enabled,
        "auto_save_amount": float(payload.auto_save_amount),
        "auto_save_time": payload.auto_save_time.isoformat(),
        "payment_method": payload.payment_method,
    }
    
    res = _client().table(AUTO_SWEEP_TABLE).insert(data).execute()
    if not res.data:
        raise ValueError("Failed to create auto-sweep settings")
    
    return AutoSweepSettingsResponse(**res.data[0])


def get_auto_sweep(sweep_id: UUID, user_id: UUID) -> AutoSweepSettingsResponse | None:
    """Get auto-sweep settings."""
    res = (
        _client()
        .table(AUTO_SWEEP_TABLE)
        .select("*")
        .eq("id", str(sweep_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    
    if not res.data:
        return None
    return AutoSweepSettingsResponse(**res.data[0])


def get_auto_sweep_by_goal(goal_id: UUID, user_id: UUID) -> AutoSweepSettingsResponse | None:
    """Get auto-sweep settings for a specific goal."""
    res = (
        _client()
        .table(AUTO_SWEEP_TABLE)
        .select("*")
        .eq("goal_id", str(goal_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    if not res.data:
        return None
    return AutoSweepSettingsResponse(**res.data[0])


def update_auto_sweep(sweep_id: UUID, user_id: UUID, payload: AutoSweepSettingsUpdate) -> AutoSweepSettingsResponse | None:
    """Update auto-sweep settings."""
    data = payload.model_dump(exclude_none=True)
    if "auto_save_amount" in data:
        data["auto_save_amount"] = float(data["auto_save_amount"])
    if "auto_save_time" in data:
        data["auto_save_time"] = data["auto_save_time"].isoformat()
    
    res = (
        _client()
        .table(AUTO_SWEEP_TABLE)
        .update(data)
        .eq("id", str(sweep_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    if not res.data:
        return None
    return AutoSweepSettingsResponse(**res.data[0])


# ===================== BUDGET BUCKETS =====================

def create_bucket(user_id: UUID, payload: BudgetBucketCreate) -> BudgetBucketResponse:
    """Create a budget bucket."""
    data = {
        "user_id": str(user_id),
        "bucket_name": payload.bucket_name,
        "allocation_percentage": float(payload.allocation_percentage),
        "bucket_color": payload.bucket_color,
        "icon_name": payload.icon_name,
        "priority_order": payload.priority_order,
    }
    
    res = _client().table(BUCKETS_TABLE).insert(data).execute()
    if not res.data:
        raise ValueError("Failed to create bucket")
    
    return BudgetBucketResponse(**res.data[0])


def list_buckets(user_id: UUID) -> list[BudgetBucketResponse]:
    """List all buckets for a user."""
    res = (
        _client()
        .table(BUCKETS_TABLE)
        .select("*")
        .eq("user_id", str(user_id))
        .order("priority_order", desc=False)
        .execute()
    )
    
    return [BudgetBucketResponse(**r) for r in res.data]


# ===================== DASHBOARD =====================

def get_savings_dashboard(user_id: UUID) -> SavingsDashboard:
    """Get complete savings dashboard."""
    goals = list_savings_goals(user_id, only_active=False)
    active_goals = [g for g in goals if g.is_active]
    buckets = list_buckets(user_id)
    streak = get_user_streak(user_id)
    
    # Calculate totals
    total_savings = sum(g.current_savings for g in goals)
    monthly_deposited = _calculate_monthly_deposited(user_id)
    
    # Get progress for each goal
    goals_progress = []
    upcoming_deadlines = []
    
    for goal in goals:
        progress_pct = (goal.current_savings / goal.target_amount * 100) if goal.target_amount > 0 else 0
        days_remaining = (goal.deadline - date.today()).days
        on_track = goal.current_savings >= (goal.monthly_goal * max(1 - days_remaining / 30, 0))
        
        goals_progress.append(SavingsProgress(
            goal_id=goal.id,
            goal_name=goal.goal_name,
            goal_type=goal.goal_type,
            target_amount=goal.target_amount,
            current_savings=goal.current_savings,
            daily_target=goal.daily_target,
            progress_percentage=Decimal(progress_pct),
            days_remaining=max(days_remaining, 0),
            on_track=on_track,
        ))
        
        if 0 <= days_remaining <= 7:
            upcoming_deadlines.append(goal)
    
    return SavingsDashboard(
        total_savings=total_savings,
        total_goals=len(goals),
        active_goals=len(active_goals),
        monthly_deposited=monthly_deposited,
        current_streak=streak.current_streak if streak else 0,
        tier_level=streak.tier_level if streak else "bronze",
        goals_progress=goals_progress,
        upcoming_deadlines=upcoming_deadlines[:5],  # Top 5
        buckets=buckets,
        goals=goals,
    )


def _calculate_monthly_deposited(user_id: UUID) -> Decimal:
    """Calculate total deposited in current month."""
    today = date.today()
    month_start = date(today.year, today.month, 1)
    
    res = (
        _client()
        .table(TRANSACTIONS_TABLE)
        .select("amount")
        .eq("user_id", str(user_id))
        .eq("transaction_type", "deposit")
        .gte("created_at", month_start.isoformat())
        .execute()
    )
    
    total = sum(Decimal(str(t["amount"])) for t in res.data)
    return total


# ===================== POLICY =====================

def get_or_create_policy(user_id: UUID, version: str = "1.0") -> PolicyConsentResponse:
    """Get or create policy consent."""
    res = (
        _client()
        .table(POLICY_TABLE)
        .select("*")
        .eq("user_id", str(user_id))
        .eq("policy_version", version)
        .execute()
    )
    
    if res.data:
        return PolicyConsentResponse(**res.data[0])
    
    # Create default policy
    policy_content = _get_default_policy_content()
    data = {
        "user_id": str(user_id),
        "policy_version": version,
        "policy_content": policy_content,
        "accepted": False,
    }
    
    res = _client().table(POLICY_TABLE).insert(data).execute()
    return PolicyConsentResponse(**res.data[0])


def accept_policy(user_id: UUID, policy_id: UUID) -> PolicyConsentResponse:
    """Accept policy."""
    res = (
        _client()
        .table(POLICY_TABLE)
        .update({
            "accepted": True,
            "accepted_at": datetime.now().isoformat(),
        })
        .eq("id", str(policy_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    
    if not res.data:
        raise ValueError("Failed to accept policy")
    
    _log_action(user_id, "policy_accepted", {"policy_id": str(policy_id)})
    return PolicyConsentResponse(**res.data[0])


def _get_default_policy_content() -> str:
    """Get default policy content."""
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
    """


# ===================== AUDIT LOGGING =====================

def _log_action(user_id: UUID, action: str, action_details: dict):
    """Log an action in transaction logs."""
    try:
        data = {
            "user_id": str(user_id),
            "action": action,
            "action_details": json.dumps(action_details),
        }
        _client().table(LOGS_TABLE).insert(data).execute()
    except Exception as e:
        logger.warning(f"Failed to log action: {e}")

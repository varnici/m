"""Budget_Best Savings Models."""
from pydantic import BaseModel, Field
from decimal import Decimal
from uuid import UUID
from datetime import datetime, date, time
from typing import Optional, List


# ===================== Savings Goals =====================

class SavingsGoalCreate(BaseModel):
    """Create a new savings goal."""
    goal_name: str = Field(..., min_length=1, max_length=255)
    goal_type: str = Field(...)  # 'shop_rent', 'house_rent', 'bills', 'staff_salaries', 'custom'
    target_amount: Decimal = Field(..., ge=0, decimal_places=2)
    monthly_goal: Decimal = Field(..., ge=0, decimal_places=2)
    deadline: date
    daily_target: Optional[Decimal] = None


class SavingsGoalUpdate(BaseModel):
    """Update a savings goal."""
    goal_name: Optional[str] = None
    target_amount: Optional[Decimal] = None
    monthly_goal: Optional[Decimal] = None
    deadline: Optional[date] = None
    is_active: Optional[bool] = None


class SavingsGoalResponse(BaseModel):
    """Savings goal response."""
    id: UUID
    user_id: UUID
    goal_name: str
    goal_type: str
    target_amount: Decimal
    monthly_goal: Decimal
    current_savings: Decimal
    daily_target: Decimal
    deadline: date
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ===================== Transactions =====================

class SavingsTransactionCreate(BaseModel):
    """Create a savings transaction."""
    goal_id: UUID
    amount: Decimal = Field(..., ge=0, decimal_places=2)
    transaction_type: str = Field(...)  # 'deposit', 'withdrawal', 'interest'
    notes: Optional[str] = None


class SavingsTransactionResponse(BaseModel):
    """Savings transaction response."""
    id: UUID
    goal_id: UUID
    user_id: UUID
    amount: Decimal
    transaction_type: str
    reference_code: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ===================== Reminders =====================

class ReminderSettingsCreate(BaseModel):
    """Create reminder settings."""
    goal_id: UUID
    reminder_time: time
    reminder_frequency: str = "daily"
    reminder_enabled: bool = True


class ReminderSettingsUpdate(BaseModel):
    """Update reminder settings."""
    reminder_time: Optional[time] = None
    reminder_enabled: Optional[bool] = None
    reminder_frequency: Optional[str] = None


class ReminderSettingsResponse(BaseModel):
    """Reminder settings response."""
    id: UUID
    user_id: UUID
    goal_id: UUID
    reminder_time: time
    reminder_enabled: bool
    reminder_frequency: str
    last_reminded_at: Optional[datetime]
    next_reminder_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ===================== Streaks & Gamification =====================

class SavingsStreakResponse(BaseModel):
    """Savings streak response."""
    id: UUID
    user_id: UUID
    current_streak: int
    best_streak: int
    streak_start_date: date
    last_saved_date: date
    tier_level: str
    badges: List[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ===================== Auto-Sweep =====================

class AutoSweepSettingsCreate(BaseModel):
    """Create auto-sweep settings."""
    goal_id: UUID
    auto_save_enabled: bool = False
    auto_save_amount: Decimal = Field(..., ge=0, decimal_places=2)
    auto_save_time: time
    payment_method: str = "wallet"  # 'card', 'bank_transfer', 'wallet'


class AutoSweepSettingsUpdate(BaseModel):
    """Update auto-sweep settings."""
    auto_save_enabled: Optional[bool] = None
    auto_save_amount: Optional[Decimal] = None
    auto_save_time: Optional[time] = None
    payment_method: Optional[str] = None


class AutoSweepSettingsResponse(BaseModel):
    """Auto-sweep settings response."""
    id: UUID
    user_id: UUID
    goal_id: UUID
    auto_save_enabled: bool
    auto_save_amount: Decimal
    auto_save_time: time
    payment_method: str
    last_auto_save_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ===================== Budget Buckets =====================

class BudgetBucketCreate(BaseModel):
    """Create a budget bucket."""
    bucket_name: str = Field(..., min_length=1, max_length=255)
    allocation_percentage: Decimal = Field(..., ge=0, le=100, decimal_places=2)
    bucket_color: str = "#1F2937"
    icon_name: Optional[str] = None
    priority_order: int = 0


class BudgetBucketUpdate(BaseModel):
    """Update a budget bucket."""
    bucket_name: Optional[str] = None
    allocation_percentage: Optional[Decimal] = None
    bucket_color: Optional[str] = None
    icon_name: Optional[str] = None
    priority_order: Optional[int] = None


class BudgetBucketResponse(BaseModel):
    """Budget bucket response."""
    id: UUID
    user_id: UUID
    bucket_name: str
    allocation_percentage: Decimal
    allocated_amount: Decimal
    bucket_color: str
    icon_name: Optional[str]
    priority_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ===================== Dashboard & Summary =====================

class SavingsProgress(BaseModel):
    """Savings progress overview."""
    goal_id: UUID
    goal_name: str
    goal_type: str
    target_amount: Decimal
    current_savings: Decimal
    daily_target: Decimal
    progress_percentage: Decimal
    days_remaining: int
    last_deposit_date: Optional[date]
    on_track: bool


class SavingsDashboard(BaseModel):
    """Complete savings dashboard."""
    total_savings: Decimal
    total_goals: int
    active_goals: int
    monthly_deposited: Decimal
    current_streak: int
    tier_level: str
    goals_progress: List[SavingsProgress]
    upcoming_deadlines: List[SavingsGoalResponse]
    buckets: List[BudgetBucketResponse]
    goals: List[SavingsGoalResponse] = []


# ===================== Policy =====================

class PolicyConsentCreate(BaseModel):
    """Create policy consent."""
    policy_version: str
    policy_content: str
    accepted: bool = False


class PolicyConsentResponse(BaseModel):
    """Policy consent response."""
    id: UUID
    user_id: UUID
    policy_version: str
    accepted: bool
    accepted_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ===================== Audit Log =====================

class TransactionLogResponse(BaseModel):
    """Transaction log response."""
    id: UUID
    user_id: UUID
    action: str
    action_details: dict
    created_at: datetime

    model_config = {"from_attributes": True}

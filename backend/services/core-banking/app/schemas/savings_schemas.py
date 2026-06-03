from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SavingsGoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "General"
    target_amount_kobo: int = Field(..., gt=0)
    currency: str = "NGN"
    target_date: Optional[date] = None
    image_url: Optional[str] = None
    is_auto_save_enabled: bool = False
    auto_save_amount_kobo: int = 0
    auto_save_frequency: Optional[str] = None


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_amount_kobo: Optional[int] = None
    status: Optional[str] = None
    is_auto_save_enabled: Optional[bool] = None
    auto_save_amount_kobo: Optional[int] = None
    auto_save_frequency: Optional[str] = None
    target_date: Optional[date] = None
    image_url: Optional[str] = None


class SavingsGoalResponse(SavingsGoalBase):
    id: str
    user_id: str
    current_total_kobo: int
    status: str
    created_at: datetime
    updated_at: datetime
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SavingsTransactionBase(BaseModel):
    goal_id: str
    amount_kobo: int
    transaction_type: str
    source: str = "manual"
    notes: Optional[str] = None
    transaction_metadata: Optional[dict] = None


class SavingsTransactionCreate(SavingsTransactionBase):
    reference: Optional[str] = None


class SavingsTransactionResponse(SavingsTransactionBase):
    id: str
    user_id: str
    status: str
    management_fee_kobo: int
    partner_commission_kobo: int
    reference: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavingsStreakResponse(BaseModel):
    user_id: str
    last_deposit_date: Optional[date]
    streak_count: int
    longest_streak: int
    total_savings_count: int
    last_streak_update: datetime

    model_config = ConfigDict(from_attributes=True)


class SavingsDashboardResponse(BaseModel):
    goals: List[SavingsGoalResponse]
    streak: Optional[SavingsStreakResponse]
    total_saved_kobo: int
    active_goals_count: int
    completed_goals_count: int
    dynamic_suggestion: Optional[dict] = None

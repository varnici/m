"""Dashboard and metrics schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, model_validator


class CreditScoreOut(BaseModel):
    """Response schema for credit score."""
    id: str
    user_id: str
    score: int
    risk_level: str
    factors: List[Dict[str, Any]]
    calculated_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    id: str
    full_name: Optional[str] = None
    avatar_initials: Optional[str] = None
    trust_level: str = "bronze"
    business_name: Optional[str] = None

    class Config:
        from_attributes = True


class WalletState(BaseModel):
    balance_kobo: int = 0
    daily_change_kobo: int = 0
    credit_limit_kobo: Optional[int] = None
    available_credit_kobo: Optional[int] = None
    total_debt_kobo: int = 0
    next_repayment_date: Optional[datetime] = None
    repayment_amount_kobo: Optional[int] = None

    class Config:
        from_attributes = True


class CreditScoreDetail(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    total_score: int = 0
    tier: str = "Bronze"
    calculated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def map_credit_score_fields(cls, data):
        if isinstance(data, dict):
            mapped = dict(data)
            mapped.setdefault("total_score", mapped.get("score", 0))
            mapped.setdefault("tier", str(mapped.get("risk_level", "Bronze")).title())
            return mapped

        return {
            "id": getattr(data, "id", None),
            "user_id": getattr(data, "user_id", None),
            "total_score": getattr(data, "score", 0),
            "tier": str(getattr(data, "risk_level", "Bronze")).title(),
            "calculated_at": getattr(data, "calculated_at", None),
        }

    class Config:
        from_attributes = True


class SalesMetricsSummary(BaseModel):
    total_amount_kobo: int = 0
    total_sales_kobo: int = 0
    num_transactions: int = 0
    transaction_count: int = 0
    average_transaction_kobo: int = 0
    vs_yesterday_percent: float = 0.0

    @model_validator(mode="before")
    @classmethod
    def map_sales_metric_fields(cls, data):
        if isinstance(data, dict):
            mapped = dict(data)
            mapped.setdefault("total_amount_kobo", mapped.get("total_sales_kobo", 0))
            mapped.setdefault("num_transactions", mapped.get("transaction_count", 0))
            mapped.setdefault("vs_yesterday_percent", 0.0)
            return mapped

        total_sales = getattr(data, "total_sales_kobo", 0)
        transaction_count = getattr(data, "transaction_count", 0)
        return {
            "total_amount_kobo": total_sales,
            "total_sales_kobo": total_sales,
            "num_transactions": transaction_count,
            "transaction_count": transaction_count,
            "average_transaction_kobo": getattr(data, "average_transaction_kobo", 0),
            "vs_yesterday_percent": 0.0,
        }

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    id: str
    amount_kobo: int
    type: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class MarketTickerItem(BaseModel):
    symbol: str
    price: Optional[str] = None
    change: str
    positive: bool


class IntelligenceItem(BaseModel):
    category: str
    source: str
    timeAgo: str
    headline: str
    subtitle: str
    url: Optional[str] = None


class SalesStreak(BaseModel):
    streak_days: int
    total_days: int
    points_earned: int
    next_reward_tier: str


class CommunityStats(BaseModel):
    total_members: int
    active_discussions: int
    new_opportunities: int


class DashboardSummary(BaseModel):
    user: UserProfile
    wallet: WalletState
    credit_score: Optional[CreditScoreDetail]
    today_sales: Optional[SalesMetricsSummary]
    recent_activity: List[TransactionSummary]
    market_ticker: List[MarketTickerItem] = []
    intelligence: List[IntelligenceItem] = []
    sales_streak: Optional[SalesStreak] = None
    community_stats: Optional[CommunityStats] = None


# Inventory Metrics Schemas
class InventoryMetricsOut(BaseModel):
    """Response schema for inventory metrics."""
    id: str
    user_id: str
    date: date
    total_inventory_value_kobo: int
    low_stock_items: int
    out_of_stock_items: int
    inventory_turnover_ratio: float
    top_selling_items: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class SalesMetricsOut(BaseModel):
    """Response schema for sales metrics."""
    id: str
    user_id: str
    date: date
    total_sales_kobo: int
    transaction_count: int
    average_transaction_kobo: int
    top_products: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class LoanMetricsOut(BaseModel):
    """Response schema for loan metrics."""
    id: str
    user_id: str
    date: date
    active_loans_count: int
    total_loan_amount_kobo: int
    total_outstanding_kobo: int
    repayment_rate: float
    default_rate: float
    created_at: datetime

    class Config:
        from_attributes = True

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# Dashboard Summary Schemas
class UserProfile(BaseModel):
    id: str
    phone: str
    email: Optional[str]
    full_name: Optional[str]
    category: str
    business_name: Optional[str]
    trading_name: Optional[str]
    ownership_type: Optional[str]
    registration_status: Optional[str]
    trust_level: str
    created_at: datetime

    class Config:
        from_attributes = True


class WalletState(BaseModel):
    balance_kobo: int
    credit_limit_kobo: Optional[int]
    available_credit_kobo: Optional[int]
    total_debt_kobo: int
    next_repayment_date: Optional[datetime]
    repayment_amount_kobo: Optional[int]

    class Config:
        from_attributes = True


class CreditScoreDetail(BaseModel):
    score: int
    risk_level: str
    factors: List[dict]
    calculated_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class SalesMetricsSummary(BaseModel):
    total_sales_kobo: int
    transaction_count: int
    average_transaction_kobo: int
    vs_yesterday_percent: float

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


# Sales Metrics Schemas
class SalesMetricsOut(BaseModel):
    id: str
    user_id: str
    date: date
    total_sales_kobo: int
    transaction_count: int
    average_transaction_kobo: int
    top_products: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


# Inventory Metrics Schemas
class InventoryMetricsOut(BaseModel):
    id: str
    user_id: str
    date: date
    total_inventory_value_kobo: int
    low_stock_items: int
    out_of_stock_items: int
    inventory_turnover_ratio: float
    top_selling_items: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


# Loan Metrics Schemas
class LoanMetricsOut(BaseModel):
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


# Credit Score Schemas
class CreditScoreOut(BaseModel):
    id: str
    user_id: str
    score: int
    risk_level: str
    factors: List[dict]
    calculated_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True
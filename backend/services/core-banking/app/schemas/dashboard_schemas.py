"""Dashboard and metrics schemas."""
from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


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


<<<<<<< HEAD
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
=======
>>>>>>> 28426ae5 (ai asistance ui and update)
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


class DashboardSummary(BaseModel):
    """Complete dashboard summary for a user."""
    user_id: str
    wallet_balance_kobo: int
    credit_score: Optional[CreditScoreOut]
    today_sales_kobo: int
    active_loans_count: int
    outstanding_kobo: int
    inventory_health: Optional[InventoryMetricsOut]
    
    class Config:
        from_attributes = True

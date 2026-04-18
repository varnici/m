from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import desc, select

from app.infrastructure.database import db_session
from app.models.credit_score import CreditScore
from app.models.inventory_metrics import InventoryMetrics
from app.models.loan_metrics import LoanMetrics
from app.models.sales import Sale
from app.models.sales_metrics import SalesMetrics
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.dashboard_schemas import (
    CreditScoreOut,
    DashboardSummary,
    InventoryMetricsOut,
    LoanMetricsOut,
    SalesMetricsOut,
)

router = APIRouter()


@router.get("/{user_id}/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(user_id: str):
    """
    Get complete dashboard summary for a user.
    Includes user profile, wallet state, credit score, today's sales, and recent activity.
    """
    with db_session() as db:
        # Get user profile
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get wallet state
        wallet = db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        ).scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        # Get latest credit score
        credit_score = db.execute(
            select(CreditScore)
            .where(CreditScore.user_id == user_id)
            .order_by(desc(CreditScore.calculated_at))
            .limit(1)
        ).scalar_one_or_none()

        # Get today's sales metrics
        today = date.today()
        today_sales = db.execute(
            select(SalesMetrics).where(
                SalesMetrics.user_id == user_id,
                SalesMetrics.date == today
            )
        ).scalar_one_or_none()

        # Get recent activity (last 5 sales transactions)
        recent_sales = db.execute(
            select(Sale)
            .where(Sale.user_id == user_id)
            .order_by(desc(Sale.sold_at))
            .limit(5)
        ).scalars().all()

        # Convert sales to transaction summaries
        recent_activity = []
        for sale in recent_sales:
            recent_activity.append({
                "id": sale.id,
                "amount_kobo": sale.quantity * sale.unit_price_kobo,
                "type": "sale",
                "description": f"Sale of {sale.quantity} units - {sale.product_sku}",
                "created_at": sale.sold_at
            })

        return {
            "user": user,
            "wallet": wallet,
            "credit_score": credit_score,
            "today_sales": today_sales,
            "recent_activity": recent_activity
        }


@router.get("/{user_id}/sales-metrics", response_model=List[SalesMetricsOut])
def get_sales_metrics(user_id: str, limit: int = 30):
    """
    Get sales metrics for a user.
    Returns last N days of sales metrics (default 30 days).
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        metrics = db.execute(
            select(SalesMetrics)
            .where(SalesMetrics.user_id == user_id)
            .order_by(desc(SalesMetrics.date))
            .limit(limit)
        ).scalars().all()

        return metrics


@router.get("/{user_id}/inventory-metrics", response_model=List[InventoryMetricsOut])
def get_inventory_metrics(user_id: str, limit: int = 30):
    """
    Get inventory metrics for a user.
    Returns last N days of inventory metrics (default 30 days).
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        metrics = db.execute(
            select(InventoryMetrics)
            .where(InventoryMetrics.user_id == user_id)
            .order_by(desc(InventoryMetrics.date))
            .limit(limit)
        ).scalars().all()

        return metrics


@router.get("/{user_id}/loan-metrics", response_model=List[LoanMetricsOut])
def get_loan_metrics(user_id: str, limit: int = 30):
    """
    Get loan metrics for a user.
    Returns last N days of loan metrics (default 30 days).
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        metrics = db.execute(
            select(LoanMetrics)
            .where(LoanMetrics.user_id == user_id)
            .order_by(desc(LoanMetrics.date))
            .limit(limit)
        ).scalars().all()

        return metrics


@router.get("/{user_id}/credit-score", response_model=CreditScoreOut)
def get_credit_score(user_id: str):
    """
    Get the latest credit score for a user.
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        credit_score = db.execute(
            select(CreditScore)
            .where(CreditScore.user_id == user_id)
            .order_by(desc(CreditScore.calculated_at))
            .limit(1)
        ).scalar_one_or_none()

        if not credit_score:
            raise HTTPException(status_code=404, detail="Credit score not found")

        return credit_score


@router.get("/{user_id}/credit-scores", response_model=List[CreditScoreOut])
def get_credit_score_history(user_id: str, limit: int = 10):
    """
    Get credit score history for a user.
    Returns last N credit score calculations (default 10).
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        scores = db.execute(
            select(CreditScore)
            .where(CreditScore.user_id == user_id)
            .order_by(desc(CreditScore.calculated_at))
            .limit(limit)
        ).scalars().all()

        return scores
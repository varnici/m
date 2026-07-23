from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select, func

from app.infrastructure.database import db_session
from app.infrastructure.auth import get_current_user_id
from app.models.inventory_metrics import InventoryMetrics
from app.models.loan_metrics import LoanMetrics
from app.models.loan_application import LoanApplication
from app.models.inventory import SalesTransaction
from app.models.sales_metrics import SalesMetrics
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.dashboard_schemas import (
    DashboardSummary,
    InventoryMetricsOut,
    LoanMetricsOut,
    SalesMetricsOut,
)
from app.services import loan_application_service

router = APIRouter()


@router.get("/{user_id}/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(user_id: str, _auth_user: str = Depends(get_current_user_id)):
    if user_id != _auth_user:
        raise HTTPException(status_code=403, detail="Access denied")
    with db_session() as db:
        # Get user profile
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get wallet state
        wallet_record = db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        ).scalar_one_or_none()
        if not wallet_record:
            raise HTTPException(status_code=404, detail="Wallet not found")

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
            select(SalesTransaction)
            .where(SalesTransaction.owner_id == user_id)
            .order_by(desc(SalesTransaction.transaction_date))
            .limit(5)
        ).scalars().all()

        # Convert sales to transaction summaries
        recent_activity = []
        for sale in recent_sales:
            recent_activity.append({
                "id": sale.id,
                "amount_kobo": sale.total_amount_kobo,
                "type": "sale",
                "description": f"{sale.order_type.upper()} sale ({sale.status})",
                "created_at": sale.transaction_date
            })

        # Get market ticker (In a real app, this would come from a cache/external API)
        market_ticker = [
            {"symbol": "USD/NGN", "price": "1,450.00", "change": "+0.45%", "positive": True},
            {"symbol": "BRENT", "price": "85.20", "change": "-1.2%", "positive": False},
            {"symbol": "COCOA", "price": "4,120", "change": "+2.1%", "positive": True},
            {"symbol": "INFLATION", "price": "29.8%", "change": "+0.5%", "positive": False},
        ]

        # Generate Intelligence (AI Briefing / News / Stocks / Trade Feed)
        intelligence = [
            {
                "category": "For You",
                "source": "Sales AI",
                "timeAgo": "Just now",
                "headline": "High Sales Velocity",
                "subtitle": "Your daily sales are performing strongly. Keep track of your fast-moving categories.",
                "url": "https://businessday.ng/category/entrepreneur/"
            },
            {
                "category": "News",
                "source": "Lagos Market News",
                "timeAgo": "1h ago",
                "headline": "Wholesale Price Shift",
                "subtitle": "Importers report a 5% drop in bulk flour cost due to port clearance. Restock planned.",
                "url": "https://techcabal.com/"
            },
            {
                "category": "Stocks",
                "source": "NGX Exchange",
                "timeAgo": "2h ago",
                "headline": "Naira Ticker Update",
                "subtitle": "USD/NGN stable at 1,450. Brent crude slips to $85.20 per barrel. Inflation projections steady.",
                "url": "https://ngxgroup.com/"
            },
            {
                "category": "Trade",
                "source": "Business Coach",
                "timeAgo": "4h ago",
                "headline": "Shared Freight Deal",
                "subtitle": "A new shared GIGL truck consolidator is forming in Lekki Phase 1. Join now to save 40%.",
                "url": "https://punchng.com/topics/business/"
            }
        ]

        # Calculate Sales Streak
        # Query sales metrics with transactions ordered by date descending
        past_metrics = db.execute(
            select(SalesMetrics)
            .where(SalesMetrics.user_id == user_id)
            .order_by(desc(SalesMetrics.date))
        ).scalars().all()
        
        # Build a set of dates that have sales
        active_dates = {m.date for m in past_metrics if m.transaction_count > 0}
        
        streak = 0
        if active_dates:
            # Check if today or yesterday is active to start the streak
            check_date = date.today()
            from datetime import timedelta
            if check_date not in active_dates:
                check_date = check_date - timedelta(days=1)
            
            while check_date in active_dates:
                streak += 1
                check_date = check_date - timedelta(days=1)
        
        # Bootstrap a baseline streak of 3 if no streak exists
        if streak == 0:
            streak = 3
        
        sales_streak = {
            "streak_days": streak,
            "total_days": 7, # Weekly target
            "points_earned": streak * 10,
            "next_reward_tier": "Silver" if streak < 5 else "Gold"
        }

        # Community Stats
        total_users = db.execute(select(func.count(User.id))).scalar() or 0
        community_stats = {
            "total_members": total_users,
            "active_discussions": 12, # In a real app, this would query a forums/chat service
            "new_opportunities": 5
        }

        # Fetch Loan Repayment Info — earliest-disbursed active loan for this user
        next_loan = db.execute(
            select(LoanApplication)
            .where(LoanApplication.user_id == user_id, LoanApplication.status == "disbursed")
            .order_by(LoanApplication.disbursed_at.asc())
        ).scalars().first()

        next_repayment_date = None
        if next_loan:
            unpaid = [s for s in next_loan.repayment_schedules if s.status != "paid"]
            if unpaid:
                next_repayment_date = min(s.due_date for s in unpaid)

        # credit_limit_kobo/available_credit_kobo used to be hardcoded
        # (50,000,000 / 35,000,000 for every user, regardless of eligibility)
        # — now sourced from the same percentile-rank eligibility check that
        # actually gates loan disbursement, so this number can't drift from
        # what POST /v1/loans will actually approve.
        loan_dashboard = loan_application_service.get_dashboard(db, user_id)

        wallet = {
            "balance_kobo": wallet_record.balance_kobo,
            "credit_limit_kobo": loan_dashboard["available_credit"] + loan_dashboard["credit_in_use"],
            "available_credit_kobo": loan_dashboard["available_credit"],
            "total_debt_kobo": loan_dashboard["credit_in_use"],
            "next_repayment_date": next_repayment_date,
            "repayment_amount_kobo": loan_dashboard["credit_in_use"]
        }

        return {
            "user": user,
            "wallet": wallet,
            "today_sales": today_sales,
            "recent_activity": recent_activity,
            "market_ticker": market_ticker,
            "intelligence": intelligence,
            "sales_streak": sales_streak,
            "community_stats": community_stats
        }


@router.get("/{user_id}/sales-metrics", response_model=List[SalesMetricsOut])
def get_sales_metrics(user_id: str, limit: int = 30, _auth_user: str = Depends(get_current_user_id)):
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
def get_inventory_metrics(user_id: str, limit: int = 30, _auth_user: str = Depends(get_current_user_id)):
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
def get_loan_metrics(user_id: str, limit: int = 30, _auth_user: str = Depends(get_current_user_id)):
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



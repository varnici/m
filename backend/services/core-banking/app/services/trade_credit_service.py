from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.savings import SavingsGoal, SavingsStreak
from app.models.inventory import SalesTransaction, TradeOrder

logger = logging.getLogger(__name__)


class TradeCreditService:
    """
    Earned purchasing power for ordering from distributors — the "credit
    limit the app allocates" for B2B ordering. Deliberately separate from
    Wallet.credit_limit_kobo/loan_application_service.py, which is a
    disbursed cash-loan product underwritten on sales percentile alone.
    This one is a "savings + sales trust score": a business owner earns
    trade credit by saving consistently AND selling consistently, not by
    outranking peers. Revived from a "Savings as Trust" engine deleted in
    commit 2ac5fca as part of an unrelated cleanup — the formula itself
    was sound, just orphaned with no callers.
    """

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id

    def calculate_trust_score(self) -> Dict[str, Any]:
        """
        Formula: (Consistency of Daily Savings) + (Sales Velocity) -> Trade
        Credit Limit = Total Savings * (Score / 25).
        """
        streak = self.db.query(SavingsStreak).filter(SavingsStreak.user_id == self.user_id).first()
        streak_count = streak.streak_count if streak else 0
        savings_consistency = min(streak_count * 1.5, 50.0)  # Cap at 50

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        total_sales_kobo = self.db.query(func.sum(SalesTransaction.total_amount_kobo)).filter(
            SalesTransaction.owner_id == self.user_id,
            SalesTransaction.transaction_date >= thirty_days_ago,
        ).scalar() or 0

        daily_velocity = total_sales_kobo / 30.0
        # Normalize: assume ₦100k/day sales = 50 points
        sales_velocity_score = min((daily_velocity / 10_000_000) * 50, 50.0)

        total_score = savings_consistency + sales_velocity_score

        total_saved_kobo = self.db.query(func.sum(SavingsGoal.current_total_kobo)).filter(
            SavingsGoal.user_id == self.user_id
        ).scalar() or 0

        trade_credit_limit_kobo = int(total_saved_kobo * (total_score / 25.0))

        return {
            "trust_score": round(total_score, 2),
            "savings_consistency": round(savings_consistency, 2),
            "sales_velocity_score": round(sales_velocity_score, 2),
            "trade_credit_limit_kobo": trade_credit_limit_kobo,
            "currency": "NGN",
        }

    def _trade_credit_in_use(self) -> int:
        """Sum of this user's own open cross-tenant orders (placed as a buyer
        against a distributor's catalog) — draft/held/dispatched-but-unpaid
        orders all still count against the limit until settled."""
        open_orders = (
            self.db.query(TradeOrder)
            .filter(
                TradeOrder.buyer_owner_id == self.user_id,
                TradeOrder.status.in_(["draft", "held", "dispatched"]),
            )
            .all()
        )
        return sum(o.total_kobo for o in open_orders)

    def get_credit_summary(self) -> Dict[str, Any]:
        score_data = self.calculate_trust_score()
        in_use_kobo = self._trade_credit_in_use()
        available_kobo = max(0, score_data["trade_credit_limit_kobo"] - in_use_kobo)
        return {
            **score_data,
            "trade_credit_in_use_kobo": in_use_kobo,
            "trade_credit_available_kobo": available_kobo,
        }

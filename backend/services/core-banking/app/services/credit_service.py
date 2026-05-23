from __future__ import annotations

import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, select, and_
from datetime import datetime, timedelta

from app.models.savings import SavingsGoal, SavingsStreak, SavingsTransaction
from app.models.inventory import SalesTransaction, Product
from app.schemas.inventory_schemas import GlobalRecommendation

logger = logging.getLogger(__name__)

class CreditService:
    """
    The Credit Underwriting Engine (Savings as Trust).
    Calculates trust scores and manages credit offers based on savings consistency and sales velocity.
    """

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id

    def calculate_trust_score(self) -> Dict[str, Any]:
        """
        Formula: (Consistency of Daily Savings) + (Inventory Turnover/Velocity) = Credit Limit.
        Returns a score and a calculated credit limit.
        """
        # 1. Savings Consistency Score (0-50 points)
        streak = self.db.query(SavingsStreak).filter(SavingsStreak.user_id == self.user_id).first()
        streak_count = streak.streak_count if streak else 0
        savings_consistency = min(streak_count * 1.5, 50.0) # Cap at 50

        # 2. Inventory Turnover / Sales Velocity Score (0-50 points)
        # Calculate velocity over the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        total_sales_kobo = self.db.query(func.sum(SalesTransaction.total_amount_kobo)).filter(
            SalesTransaction.owner_id == self.user_id,
            SalesTransaction.transaction_date >= thirty_days_ago
        ).scalar() or 0
        
        # Velocity = Total Sales / 30 days
        daily_velocity = total_sales_kobo / 30.0
        # Normalize: Assume ₦100k daily sales = 50 points
        sales_velocity_score = min((daily_velocity / 10000000) * 50, 50.0) 

        total_score = savings_consistency + sales_velocity_score
        
        # 3. Calculate Credit Limit
        # Basic formula: Total Savings * (Score / 25)
        total_saved_kobo = self.db.query(func.sum(SavingsGoal.current_total_kobo)).filter(
            SavingsGoal.user_id == self.user_id
        ).scalar() or 0
        
        credit_limit_kobo = int(total_saved_kobo * (total_score / 25.0))

        return {
            "trust_score": round(total_score, 2),
            "savings_consistency": round(savings_consistency, 2),
            "sales_velocity_score": round(sales_velocity_score, 2),
            "credit_limit_kobo": credit_limit_kobo,
            "currency": "NGN"
        }

    def generate_credit_offers(self) -> List[GlobalRecommendation]:
        """
        Triggers a UI component: "You’ve earned ₦100k Inventory Credit. Restock now?"
        """
        score_data = self.calculate_trust_score()
        offers = []

        if score_data["trust_score"] >= 40: # Threshold for credit
            offers.append(GlobalRecommendation(
                id=f"credit_offer_{self.user_id}",
                type="credit",
                title="Credit Offer Available",
                description=f"You've earned ₦{score_data['credit_limit_kobo'] / 100:,.0f} Inventory Credit based on your savings streak!",
                impact="high",
                priority=100,
                action_text="Claim Credit",
                action_route="ApplyLoan",
                metadata={"credit_limit_kobo": score_data["credit_limit_kobo"]}
            ))
            
        return offers

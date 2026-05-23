from __future__ import annotations

import logging
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func

from app.models.savings import SavingsGoal, SavingsTransaction, SavingsStreak, SavingsGoalStatus, SavingsTransactionStatus, SavingsTransactionType
from app.models.inventory import SalesTransaction, Product
from app.schemas.savings_schemas import (
    SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse,
    SavingsTransactionCreate, SavingsTransactionResponse,
    SavingsStreakResponse, SavingsDashboardResponse
)

logger = logging.getLogger(__name__)

class SavingsService:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id

    def create_goal(self, payload: SavingsGoalCreate) -> SavingsGoal:
        goal = SavingsGoal(
            user_id=self.user_id,
            **payload.model_dump()
        )
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def get_goals(self, status: Optional[str] = None) -> List[SavingsGoal]:
        query = select(SavingsGoal).where(SavingsGoal.user_id == self.user_id)
        if status:
            query = query.where(SavingsGoal.status == status)
        result = self.db.execute(query)
        return result.scalars().all()

    def get_goal_by_id(self, goal_id: str) -> Optional[SavingsGoal]:
        query = select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == self.user_id
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def update_goal(self, goal_id: str, payload: SavingsGoalUpdate) -> Optional[SavingsGoal]:
        goal = self.get_goal_by_id(goal_id)
        if not goal:
            return None
        
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(goal, key, value)
        
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def record_transaction(self, payload: SavingsTransactionCreate) -> SavingsTransaction:
        # Atomic update logic
        goal = self.get_goal_by_id(payload.goal_id)
        if not goal:
            raise ValueError("Savings goal not found")

        # Fee calculations (Hidden partner commission logic)
        # Default management fee to 0 for user principal as per mandate
        management_fee = 0
        # partner_commission field to track revenue earned from banking float/gateway
        partner_commission = int(abs(payload.amount_kobo) * 0.01) # Example 1% commission

        transaction = SavingsTransaction(
            user_id=self.user_id,
            goal_id=payload.goal_id,
            amount_kobo=payload.amount_kobo,
            transaction_type=payload.transaction_type,
            status=SavingsTransactionStatus.COMPLETED.value, # Default to completed for internal deposits
            management_fee_kobo=management_fee,
            partner_commission_kobo=partner_commission,
            reference=payload.reference,
            source=payload.source,
            notes=payload.notes,
            transaction_metadata=payload.transaction_metadata
        )
        
        # Enforce "Sweep-First" logic: If the user tries to deposit manually, 
        # we log it but prioritize automated flows in the system.
        if payload.source == "manual" and payload.transaction_type == SavingsTransactionType.DEPOSIT.value:
            logger.info(f"Manual deposit attempt by user {self.user_id}. Encouraging Auto-Sweep.")
            # For this strict "Non-Negotiable" requirement, we could raise an error here
            # raise HTTPException(status_code=403, detail="Manual deposits are disabled. Please use Auto-Sweep.")
        
        self.db.add(transaction)
        
        # Atomically update current_total
        goal.current_total_kobo += payload.amount_kobo
        
        # Check if goal is completed
        if goal.current_total_kobo >= goal.target_amount_kobo:
            goal.status = SavingsGoalStatus.COMPLETED.value

        # Update streak
        if payload.transaction_type == SavingsTransactionType.DEPOSIT.value:
            self._update_streak()

        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def _update_streak(self):
        today = date.today()
        query = select(SavingsStreak).where(SavingsStreak.user_id == self.user_id)
        streak = self.db.execute(query).scalar_one_or_none()
        
        if not streak:
            streak = SavingsStreak(
                user_id=self.user_id,
                last_deposit_date=today,
                streak_count=1,
                longest_streak=1,
                total_savings_count=1
            )
            self.db.add(streak)
        else:
            if streak.last_deposit_date == today:
                # Already saved today, just increment total count
                streak.total_savings_count += 1
            elif streak.last_deposit_date == today - timedelta(days=1):
                # Consecutive day
                streak.streak_count += 1
                streak.longest_streak = max(streak.longest_streak, streak.streak_count)
                streak.last_deposit_date = today
                streak.total_savings_count += 1
            else:
                # Streak broken
                streak.streak_count = 1
                streak.last_deposit_date = today
                streak.total_savings_count += 1
            
            streak.last_streak_update = datetime.now(timezone.utc)

    def get_dashboard(self) -> Dict[str, Any]:
        goals = self.get_goals()
        streak_query = select(SavingsStreak).where(SavingsStreak.user_id == self.user_id)
        streak = self.db.execute(streak_query).scalar_one_or_none()
        
        total_saved = sum(g.current_total_kobo for g in goals)
        active_goals = [g for g in goals if g.status == SavingsGoalStatus.ACTIVE.value]
        completed_goals = [g for g in goals if g.status == SavingsGoalStatus.COMPLETED.value]
        
        # Calculate progress for each goal
        goal_responses = []
        for g in goals:
            resp = SavingsGoalResponse.model_validate(g)
            resp.progress_percentage = min(100.0, (g.current_total_kobo / g.target_amount_kobo) * 100.0) if g.target_amount_kobo > 0 else 0.0
            goal_responses.append(resp)

        return {
            "goals": goal_responses,
            "streak": streak,
            "total_saved_kobo": total_saved,
            "active_goals_count": len(active_goals),
            "completed_goals_count": len(completed_goals),
            "dynamic_suggestion": self.calculate_dynamic_daily_suggestion()
        }

    def suggest_savings(self, sales_transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Suggest a micro-contribution based on profit from a recent sale.
        Contextual Trigger for the "Unavoidable" financial loop.
        """
        query = select(SalesTransaction).where(SalesTransaction.id == sales_transaction_id)
        sale = self.db.execute(query).scalar_one_or_none()
        
        if not sale:
            return None
        
        # Calculate profit (simplified: sum of line profits)
        # In a real system, we'd join with products to get cost prices
        # For now, let's assume 10% of total amount as profit if not detailed
        total_profit = int(sale.total_amount_kobo * 0.2) # Assuming 20% margin for demo
        suggested_amount = int(total_profit * 0.1) # Suggest 10% of profit
        
        # Find an active goal to suggest
        active_goals = self.get_goals(status=SavingsGoalStatus.ACTIVE.value)
        if not active_goals:
            return None
            
        target_goal = active_goals[0] # Suggest the first active goal
        
        return {
            "suggested_amount_kobo": suggested_amount,
            "goal_id": target_goal.id,
            "goal_title": target_goal.title,
            "message": f"You just made ₦{total_profit/100:,.0f} profit. Save ₦{suggested_amount/100:,.0f} toward {target_goal.title}?"
        }

    def calculate_dynamic_daily_suggestion(self) -> Dict[str, Any]:
        """
        AI Dynamic Savings Goal: Adjusts deposit based on sales velocity.
        Prevents breaking streaks during slow weeks.
        """
        # 1. Get baseline daily auto-save amount from active goals
        active_goals = self.get_goals(status=SavingsGoalStatus.ACTIVE.value)
        if not active_goals:
            return {"suggested_amount_kobo": 0, "reason": "no_active_goals"}

        baseline_daily_kobo = sum(g.auto_save_amount_kobo or 0 for g in active_goals)
        if baseline_daily_kobo == 0:
            baseline_daily_kobo = 50000 # Default ₦500 if none set

        # 2. Analyze Sales Velocity (last 7 days vs previous 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        fourteen_days_ago = datetime.utcnow() - timedelta(days=14)

        current_sales = self.db.query(func.sum(SalesTransaction.total_amount_kobo)).filter(
            SalesTransaction.owner_id == self.user_id,
            SalesTransaction.transaction_date >= seven_days_ago
        ).scalar() or 0

        previous_sales = self.db.query(func.sum(SalesTransaction.total_amount_kobo)).filter(
            SalesTransaction.owner_id == self.user_id,
            SalesTransaction.transaction_date < seven_days_ago,
            SalesTransaction.transaction_date >= fourteen_days_ago
        ).scalar() or 0

        # 3. Adjust Suggestion
        adjustment_factor = 1.0
        reason = "steady_sales"

        if previous_sales > 0:
            growth_rate = (current_sales - previous_sales) / previous_sales
            if growth_rate < -0.2: # Sales dropped by more than 20%
                adjustment_factor = 0.5 # Reduce by 50%
                reason = "slow_week_detected"
            elif growth_rate > 0.2: # Sales grew by more than 20%
                adjustment_factor = 1.2 # Increase by 20%
                reason = "high_growth_detected"

        suggested_amount_kobo = int(baseline_daily_kobo * adjustment_factor)

        return {
            "suggested_amount_kobo": suggested_amount_kobo,
            "baseline_amount_kobo": baseline_daily_kobo,
            "adjustment_factor": adjustment_factor,
            "reason": reason,
            "message": f"Based on your {reason.replace('_', ' ')}, we've adjusted your daily goal to ₦{suggested_amount_kobo/100:,.0f} to protect your streak."
        }

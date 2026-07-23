from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.infrastructure.database import SessionLocal
from app.models.savings import SavingsGoal, SavingsTransaction, SavingsGoalStatus, SavingsTransactionType, SavingsTransactionStatus
from app.schemas.savings_schemas import SavingsTransactionCreate
from app.services.savings_service import SavingsService

logger = logging.getLogger(__name__)

def run_auto_sweep_process():
    """
    CRON task to process auto-save goals.
    Checks for active auto-save flags and initiates micro-contributions.
    """
    logger.info("Starting Auto-Sweep process...")
    db: Session = SessionLocal()()
    try:
        # Find active goals with auto-save enabled
        query = select(SavingsGoal).where(
            SavingsGoal.is_auto_save_enabled == True,
            SavingsGoal.status == SavingsGoalStatus.ACTIVE.value,
            SavingsGoal.auto_save_amount_kobo > 0
        )
        goals = db.execute(query).scalars().all()
        
        for goal in goals:
            # Check frequency logic (simplified: assume daily for now)
            # In a real system, we'd check if today matches the frequency schedule
            
            logger.info(f"Processing auto-save for goal {goal.id} (user {goal.user_id})")
            
            # Record the auto-save transaction. record_transaction() debits the
            # user's real wallet balance before crediting the goal — a goal
            # with insufficient wallet funds simply doesn't sweep this cycle,
            # rather than faking a deposit that never happened.
            service = SavingsService(db, goal.user_id)
            try:
                service.record_transaction(
                    payload=SavingsTransactionCreate(
                        goal_id=goal.id,
                        amount_kobo=goal.auto_save_amount_kobo,
                        transaction_type=SavingsTransactionType.DEPOSIT.value,
                        notes="Auto-Sweep contribution",
                        transaction_metadata={"type": "auto_sweep"}
                    )
                )
                logger.info(f"Successfully processed auto-save for goal {goal.id}")
            except Exception as e:
                logger.error(f"Failed to process auto-save for goal {goal.id}: {e}")
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in Auto-Sweep process: {e}")
        db.rollback()
    finally:
        db.close()
    logger.info("Auto-Sweep process completed.")

"""
Daily Loan Metrics Rollup Job
Aggregates loan data into LoanMetrics for dashboard display.
Runs daily to calculate loan performance metrics.
"""

from datetime import date, datetime, timedelta
from typing import Dict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.loan_application import LoanApplication
from app.models.loan_metrics import LoanMetrics
from app.models.loan_repayment_schedule import LoanRepaymentSchedule


async def calculate_loan_metrics_for_user(session: AsyncSession, user_id: str, target_date: date) -> Dict:
    """
    Calculate loan metrics for a user.
    """
    # Active (disbursed, not yet fully repaid) loan applications
    active_loans_query = select(func.count(LoanApplication.id)).where(
        LoanApplication.user_id == user_id,
        LoanApplication.status == "disbursed",
    )
    active_loans_result = await session.execute(active_loans_query)
    active_loans_count = active_loans_result.scalar() or 0

    total_principal_query = select(
        func.coalesce(func.sum(LoanApplication.amount_kobo), 0)
    ).where(
        LoanApplication.user_id == user_id,
        LoanApplication.status == "disbursed",
    )
    total_loan_amount_kobo = (await session.execute(total_principal_query)).scalar() or 0

    outstanding_query = (
        select(func.coalesce(func.sum(LoanRepaymentSchedule.amount_kobo), 0))
        .join(LoanApplication, LoanApplication.id == LoanRepaymentSchedule.loan_application_id)
        .where(
            LoanApplication.user_id == user_id,
            LoanApplication.status == "disbursed",
            LoanRepaymentSchedule.status != "paid",
        )
    )
    total_outstanding_kobo = (await session.execute(outstanding_query)).scalar() or 0

    repayment_rate = 0.0
    if total_loan_amount_kobo > 0:
        repaid_amount = total_loan_amount_kobo - total_outstanding_kobo
        repayment_rate = (repaid_amount / total_loan_amount_kobo) * 100

    # "Defaulted" proxy: disbursed loans with at least one installment overdue
    # by more than 30 days — there's no separately-stored default status.
    default_cutoff = target_date - timedelta(days=30)
    defaulted_query = (
        select(func.count(func.distinct(LoanApplication.id)))
        .join(LoanRepaymentSchedule, LoanRepaymentSchedule.loan_application_id == LoanApplication.id)
        .where(
            LoanApplication.user_id == user_id,
            LoanApplication.status == "disbursed",
            LoanRepaymentSchedule.status != "paid",
            LoanRepaymentSchedule.due_date < default_cutoff,
        )
    )
    defaulted_count = (await session.execute(defaulted_query)).scalar() or 0

    total_loans_ever = active_loans_count
    default_rate = (defaulted_count / total_loans_ever * 100) if total_loans_ever > 0 else 0.0

    return {
        "active_loans_count": active_loans_count,
        "total_loan_amount_kobo": total_loan_amount_kobo,
        "total_outstanding_kobo": total_outstanding_kobo,
        "repayment_rate": repayment_rate,
        "default_rate": default_rate,
    }


async def calculate_daily_loan_rollup(target_date: date) -> None:
    """
    Calculate loan metrics for all users for the given date.
    """
    async for session in get_db():
        try:
            users_with_loans_query = select(LoanApplication.user_id).distinct()
            users_result = await session.execute(users_with_loans_query)
            user_ids = [row.user_id for row in users_result]

            processed_count = 0
            for user_id in user_ids:
                metrics_data = await calculate_loan_metrics_for_user(session, user_id, target_date)

                existing_metrics = await session.execute(
                    select(LoanMetrics).where(
                        LoanMetrics.user_id == user_id,
                        LoanMetrics.date == target_date
                    )
                )
                existing = existing_metrics.scalar_one_or_none()

                if existing:
                    existing.active_loans_count = metrics_data['active_loans_count']
                    existing.total_loan_amount_kobo = metrics_data['total_loan_amount_kobo']
                    existing.total_outstanding_kobo = metrics_data['total_outstanding_kobo']
                    existing.repayment_rate = metrics_data['repayment_rate']
                    existing.default_rate = metrics_data['default_rate']
                    existing.created_at = datetime.utcnow()
                else:
                    new_metrics = LoanMetrics(
                        user_id=user_id,
                        date=target_date,
                        active_loans_count=metrics_data['active_loans_count'],
                        total_loan_amount_kobo=metrics_data['total_loan_amount_kobo'],
                        total_outstanding_kobo=metrics_data['total_outstanding_kobo'],
                        repayment_rate=metrics_data['repayment_rate'],
                        default_rate=metrics_data['default_rate'],
                    )
                    session.add(new_metrics)

                processed_count += 1

            await session.commit()
            print(f"Successfully processed loan rollup for {target_date} for {processed_count} users")

        except Exception as e:
            await session.rollback()
            print(f"Error in daily loan rollup for {target_date}: {str(e)}")
            raise


async def run_daily_loan_rollup() -> None:
    """
    Main entry point for the daily loan rollup job.
    Calculates metrics for yesterday's date.
    """
    target_date = date.today() - timedelta(days=1)
    await calculate_daily_loan_rollup(target_date)


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_daily_loan_rollup())

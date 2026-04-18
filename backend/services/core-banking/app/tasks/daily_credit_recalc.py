"""
Daily Credit Score Recalculation Job
Recalculates credit scores for all active users based on 4 drivers:
- Sales velocity (35%)
- Repayment consistency (30%)
- Category risk (20%)
- Income stability (15%)

Runs at 02:00 Lagos time daily.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.credit_score import CreditScore
from app.models.loan import Loan
from app.models.repayment import Repayment
from app.models.sales import Sale
from app.models.user import User


# Category risk scores (lower is better)
CATEGORY_RISK_SCORES = {
    'personal': 80,
    'nine_to_five': 75,
    'business_owner': 70,
    'retail': 65,
    'wholesale': 60,
    'manufacturing': 55,
    'services': 50,
}

# Score ranges for tier assignment
SCORE_RANGES = {
    'Bronze': (0, 250),
    'Silver': (250, 500),
    'Gold': (500, 750),
    'Platinum': (750, 1000),
}


async def calculate_sales_velocity_score(session: AsyncSession, user_id: str) -> int:
    """
    Calculate sales velocity score (35% weight).
    Compares 7-day average vs 30-day average.
    """
    today = date.today()

    # Get 7-day sales (last 7 days)
    week_ago = today - timedelta(days=7)
    weekly_sales_query = select(
        func.sum(Sale.quantity * Sale.unit_price_kobo)
    ).where(
        Sale.user_id == user_id,
        func.date(Sale.sold_at) >= week_ago,
        func.date(Sale.sold_at) <= today
    )
    weekly_result = await session.execute(weekly_sales_query)
    weekly_sales = weekly_result.scalar() or 0
    weekly_avg = weekly_sales / 7

    # Get 30-day sales (last 30 days)
    month_ago = today - timedelta(days=30)
    monthly_sales_query = select(
        func.sum(Sale.quantity * Sale.unit_price_kobo)
    ).where(
        Sale.user_id == user_id,
        func.date(Sale.sold_at) >= month_ago,
        func.date(Sale.sold_at) <= today
    )
    monthly_result = await session.execute(monthly_sales_query)
    monthly_sales = monthly_result.scalar() or 0
    monthly_avg = monthly_sales / 30

    if monthly_avg == 0:
        return 0

    # Velocity ratio (7-day avg / 30-day avg)
    velocity_ratio = weekly_avg / monthly_avg

    # Convert to score (0-100), cap at 2x for max score
    velocity_score = min(velocity_ratio * 50, 100)

    return int(velocity_score)


async def calculate_repayment_consistency_score(session: AsyncSession, user_id: str) -> int:
    """
    Calculate repayment consistency score (30% weight).
    Based on on-time repayments vs total repayments.
    """
    # Get all repayments for the user
    repayments_query = select(Repayment).where(Repayment.user_id == user_id)
    repayments_result = await session.execute(repayments_query)
    repayments = repayments_result.scalars().all()

    if not repayments:
        return 50  # Neutral score for no repayment history

    total_repayments = len(repayments)
    on_time_repayments = sum(1 for r in repayments if r.status == 'on_time')

    if total_repayments == 0:
        return 50

    consistency_ratio = on_time_repayments / total_repayments
    consistency_score = int(consistency_ratio * 100)

    return consistency_score


async def calculate_category_risk_score(session: AsyncSession, user_id: str) -> int:
    """
    Calculate category risk score (20% weight).
    Based on user's business category.
    """
    user_query = select(User.category).where(User.id == user_id)
    user_result = await session.execute(user_query)
    user_category = user_result.scalar()

    if not user_category:
        return 50  # Neutral score

    return CATEGORY_RISK_SCORES.get(user_category, 50)


async def calculate_income_stability_score(session: AsyncSession, user_id: str) -> int:
    """
    Calculate income stability score (15% weight).
    Based on standard deviation of daily sales over last 30 days.
    """
    today = date.today()
    month_ago = today - timedelta(days=30)

    # Get daily sales for last 30 days
    daily_sales_query = select(
        func.date(Sale.sold_at).label('sale_date'),
        func.sum(Sale.quantity * Sale.unit_price_kobo).label('daily_sales')
    ).where(
        Sale.user_id == user_id,
        func.date(Sale.sold_at) >= month_ago,
        func.date(Sale.sold_at) <= today
    ).group_by(func.date(Sale.sold_at))

    daily_result = await session.execute(daily_sales_query)
    daily_sales = {row.sale_date: row.daily_sales for row in daily_result}

    if len(daily_sales) < 7:  # Need at least a week of data
        return 50  # Neutral score

    # Calculate mean
    sales_values = list(daily_sales.values())
    mean_sales = sum(sales_values) / len(sales_values)

    if mean_sales == 0:
        return 50

    # Calculate standard deviation
    variance = sum((x - mean_sales) ** 2 for x in sales_values) / len(sales_values)
    std_dev = variance ** 0.5

    # Coefficient of variation (std_dev / mean)
    cv = std_dev / mean_sales

    # Convert to stability score (lower CV = higher stability)
    # CV of 0 = perfect stability (100 score)
    # CV of 1+ = very unstable (0 score)
    stability_score = max(0, 100 - (cv * 100))

    return int(stability_score)


def calculate_overall_score(driver_scores: Dict[str, int]) -> Tuple[int, str]:
    """
    Calculate overall credit score from driver scores and determine tier.
    """
    sales_velocity = driver_scores['sales_velocity']
    repayment_consistency = driver_scores['repayment_consistency']
    category_risk = driver_scores['category_risk']
    income_stability = driver_scores['income_stability']

    # Weighted calculation
    overall_score = (
        sales_velocity * 0.35 +
        repayment_consistency * 0.30 +
        category_risk * 0.20 +
        income_stability * 0.15
    )

    # Determine tier
    score_int = int(overall_score)
    tier = 'Bronze'
    for tier_name, (min_score, max_score) in SCORE_RANGES.items():
        if min_score <= score_int < max_score:
            tier = tier_name
            break

    return score_int, tier


async def recalculate_credit_score_for_user(session: AsyncSession, user_id: str) -> None:
    """
    Recalculate credit score for a single user.
    """
    try:
        # Calculate all driver scores
        driver_scores = {
            'sales_velocity': await calculate_sales_velocity_score(session, user_id),
            'repayment_consistency': await calculate_repayment_consistency_score(session, user_id),
            'category_risk': await calculate_category_risk_score(session, user_id),
            'income_stability': await calculate_income_stability_score(session, user_id),
        }

        # Calculate overall score and tier
        overall_score, risk_level = calculate_overall_score(driver_scores)

        # Create factors array for storage
        factors = [
            {'name': 'sales_velocity', 'score': driver_scores['sales_velocity'], 'weight': 0.35},
            {'name': 'repayment_consistency', 'score': driver_scores['repayment_consistency'], 'weight': 0.30},
            {'name': 'category_risk', 'score': driver_scores['category_risk'], 'weight': 0.20},
            {'name': 'income_stability', 'score': driver_scores['income_stability'], 'weight': 0.15},
        ]

        # Set expiration (30 days from now)
        expires_at = datetime.utcnow() + timedelta(days=30)

        # Create new credit score record
        credit_score = CreditScore(
            user_id=user_id,
            score=overall_score,
            risk_level=risk_level.lower(),  # Store as lowercase
            factors=factors,
            calculated_at=datetime.utcnow(),
            expires_at=expires_at,
        )

        session.add(credit_score)

        print(f"Calculated credit score for user {user_id}: {overall_score} ({risk_level})")

    except Exception as e:
        print(f"Error calculating credit score for user {user_id}: {str(e)}")
        raise


async def run_daily_credit_recalculation() -> None:
    """
    Main entry point for the daily credit score recalculation job.
    Processes all active users.
    """
    async for session in get_db():
        try:
            # Get all users (for now, all users are considered active)
            # TODO: Add logic to filter only active users
            users_query = select(User.id)
            users_result = await session.execute(users_query)
            user_ids = [row.id for row in users_result]

            processed_count = 0
            for user_id in user_ids:
                await recalculate_credit_score_for_user(session, user_id)
                processed_count += 1

            await session.commit()
            print(f"Successfully recalculated credit scores for {processed_count} users")

        except Exception as e:
            await session.rollback()
            print(f"Error in daily credit recalculation: {str(e)}")
            raise


if __name__ == "__main__":
    # For testing - run synchronously
    import asyncio
    asyncio.run(run_daily_credit_recalculation())
"""
Daily Sales Rollup Job
Aggregates daily sales data into SalesMetrics for dashboard display.
Runs at 00:15 Lagos time (15 minutes past midnight).
"""

from datetime import date, datetime, timedelta
from typing import List

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.infrastructure.database import db_session
from app.models.sales import Sale
from app.models.sales_metrics import SalesMetrics
from app.models.inventory import Product, StockMovement


def calculate_daily_sales_rollup(target_date: date) -> None:
    """
    Calculate sales metrics for all users for the given date.

    Args:
        target_date: The date to calculate metrics for (in UTC)
    """
    with db_session() as session:
        try:
            # Get all users who had sales on the target date
            user_sales_query = select(
                Sale.user_id,
                func.count(Sale.id).label('transaction_count'),
                func.sum(Sale.quantity).label('total_units'),
                func.sum(Sale.quantity * Sale.unit_price_kobo).label('total_sales_kobo')
            ).where(
                func.date(Sale.sold_at) == target_date
            ).group_by(Sale.user_id)

            user_sales_data = session.execute(user_sales_query).all()

            for user_data in user_sales_data:
                user_id = user_data.user_id
                transaction_count = user_data.transaction_count
                total_units = user_data.total_units
                total_sales_kobo = user_data.total_sales_kobo

                # Calculate average transaction value
                avg_transaction_kobo = total_sales_kobo // transaction_count if transaction_count > 0 else 0

                # Calculate tax liability (7.5% VAT)
                tax_liability_kobo = int(total_sales_kobo * 0.075)

                # Get previous day's sales for comparison
                prev_date = target_date - timedelta(days=1)
                prev_sales_query = select(
                    func.sum(Sale.quantity * Sale.unit_price_kobo)
                ).where(
                    Sale.user_id == user_id,
                    func.date(Sale.sold_at) == prev_date
                )
                prev_sales = session.execute(prev_sales_query).scalar() or 0

                # Calculate vs yesterday percentage
                vs_yesterday_percent = 0.0
                if prev_sales > 0:
                    vs_yesterday_percent = ((total_sales_kobo - prev_sales) / prev_sales) * 100

                # Get top products for the user on this date
                top_products_query = text("""
                    SELECT sku, name, total_sold 
                    FROM best_selling_products(:owner_id, 5, :target_date, :target_date)
                """)
                top_products_data = session.execute(top_products_query, {
                    "owner_id": user_id,
                    "target_date": target_date
                }).all()
                
                top_products_json = [
                    {"sku": p.sku, "name": p.name, "quantity": int(p.total_sold)}
                    for p in top_products_data
                ]

                # Upsert SalesMetrics record
                existing = session.execute(
                    select(SalesMetrics).where(
                        SalesMetrics.user_id == user_id,
                        SalesMetrics.date == target_date
                    )
                ).scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.total_sales_kobo = total_sales_kobo
                    existing.transaction_count = transaction_count
                    existing.average_transaction_kobo = avg_transaction_kobo
                    existing.top_products = top_products_json
                    existing.created_at = datetime.utcnow()
                else:
                    # Create new record
                    new_metrics = SalesMetrics(
                        user_id=user_id,
                        date=target_date,
                        total_sales_kobo=total_sales_kobo,
                        transaction_count=transaction_count,
                        average_transaction_kobo=avg_transaction_kobo,
                        top_products=top_products_json,
                    )
                    session.add(new_metrics)

            session.commit()
            print(f"Successfully processed sales rollup for {target_date} for {len(user_sales_data)} users")

        except Exception as e:
            session.rollback()
            print(f"Error in daily sales rollup for {target_date}: {str(e)}")
            raise


def run_daily_sales_rollup() -> None:
    """
    Main entry point for the daily sales rollup job.
    Calculates metrics for yesterday's date.
    """
    # Calculate for yesterday (job runs early morning)
    target_date = date.today() - timedelta(days=1)
    calculate_daily_sales_rollup(target_date)


if __name__ == "__main__":
    run_daily_sales_rollup()
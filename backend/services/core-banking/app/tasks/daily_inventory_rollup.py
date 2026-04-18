"""
Daily Inventory Metrics Rollup Job
Aggregates inventory data into InventoryMetrics for dashboard display.
Runs daily to calculate inventory turnover, stock levels, etc.

Note: This is a simplified version that estimates metrics from sales data.
In production, this would integrate with actual inventory management system.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.inventory_metrics import InventoryMetrics
from app.models.sales import Sale


async def calculate_inventory_metrics_for_user(session: AsyncSession, user_id: str, target_date: date) -> Dict:
    """
    Calculate inventory metrics for a user.
    Since we don't have detailed inventory data, we'll estimate based on sales patterns.
    """
    # Get sales data for the last 30 days to estimate inventory metrics
    month_ago = target_date - timedelta(days=30)

    # Calculate total sales value in the period
    sales_query = select(
        func.sum(Sale.quantity * Sale.unit_price_kobo).label('total_sales_value'),
        func.sum(Sale.quantity).label('total_units_sold')
    ).where(
        Sale.user_id == user_id,
        func.date(Sale.sold_at) >= month_ago,
        func.date(Sale.sold_at) <= target_date
    )

    sales_result = await session.execute(sales_query)
    sales_data = sales_result.first()

    total_sales_value = sales_data.total_sales_value or 0
    total_units_sold = sales_data.total_units_sold or 0

    # Estimate inventory value (assume current inventory is 30 days worth of sales)
    # This is a rough estimate - in reality, this would come from inventory system
    estimated_inventory_value = total_sales_value // 3  # 30-day sales / 10 days avg inventory

    # Estimate stock levels (simplified)
    # Assume low stock if sales velocity is high
    avg_daily_sales = total_sales_value / 30
    low_stock_threshold = avg_daily_sales * 2  # 2 days of sales

    # Mock some stock issues (in production, this would query actual inventory)
    low_stock_items = 2 if estimated_inventory_value < low_stock_threshold else 0
    out_of_stock_items = 1 if estimated_inventory_value < (low_stock_threshold / 2) else 0

    # Calculate inventory turnover ratio
    # Turnover = Cost of Goods Sold / Average Inventory Value
    # Simplified: assume COGS = 70% of sales value
    cogs = total_sales_value * 0.7
    avg_inventory_value = estimated_inventory_value  # Simplified
    inventory_turnover_ratio = cogs / avg_inventory_value if avg_inventory_value > 0 else 0

    # Mock top selling items (would come from actual inventory data)
    top_selling_items = [
        {"sku": "PROD001", "name": "Popular Item 1", "sales": 150},
        {"sku": "PROD002", "name": "Popular Item 2", "sales": 120},
        {"sku": "PROD003", "name": "Popular Item 3", "sales": 95},
    ]

    return {
        'total_inventory_value_kobo': estimated_inventory_value,
        'low_stock_items': low_stock_items,
        'out_of_stock_items': out_of_stock_items,
        'inventory_turnover_ratio': inventory_turnover_ratio,
        'top_selling_items': top_selling_items,
    }


async def calculate_daily_inventory_rollup(target_date: date) -> None:
    """
    Calculate inventory metrics for all users for the given date.
    """
    async for session in get_db():
        try:
            # Get all users (simplified - in production, filter users with inventory)
            from app.models.user import User
            users_query = select(User.id)
            users_result = await session.execute(users_query)
            user_ids = [row.id for row in users_result]

            processed_count = 0
            for user_id in user_ids:
                metrics_data = await calculate_inventory_metrics_for_user(session, user_id, target_date)

                # Upsert InventoryMetrics record
                existing_metrics = await session.execute(
                    select(InventoryMetrics).where(
                        InventoryMetrics.user_id == user_id,
                        InventoryMetrics.date == target_date
                    )
                )
                existing = existing_metrics.scalar_one_or_none()

                if existing:
                    # Update existing record
                    existing.total_inventory_value_kobo = metrics_data['total_inventory_value_kobo']
                    existing.low_stock_items = metrics_data['low_stock_items']
                    existing.out_of_stock_items = metrics_data['out_of_stock_items']
                    existing.inventory_turnover_ratio = metrics_data['inventory_turnover_ratio']
                    existing.top_selling_items = metrics_data['top_selling_items']
                    existing.created_at = datetime.utcnow()
                else:
                    # Create new record
                    new_metrics = InventoryMetrics(
                        user_id=user_id,
                        date=target_date,
                        total_inventory_value_kobo=metrics_data['total_inventory_value_kobo'],
                        low_stock_items=metrics_data['low_stock_items'],
                        out_of_stock_items=metrics_data['out_of_stock_items'],
                        inventory_turnover_ratio=metrics_data['inventory_turnover_ratio'],
                        top_selling_items=metrics_data['top_selling_items'],
                    )
                    session.add(new_metrics)

                processed_count += 1

            await session.commit()
            print(f"Successfully processed inventory rollup for {target_date} for {processed_count} users")

        except Exception as e:
            await session.rollback()
            print(f"Error in daily inventory rollup for {target_date}: {str(e)}")
            raise


async def run_daily_inventory_rollup() -> None:
    """
    Main entry point for the daily inventory rollup job.
    Calculates metrics for yesterday's date.
    """
    # Calculate for yesterday (job runs early morning)
    target_date = date.today() - timedelta(days=1)
    await calculate_daily_inventory_rollup(target_date)


if __name__ == "__main__":
    # For testing - run synchronously
    import asyncio
    asyncio.run(run_daily_inventory_rollup())
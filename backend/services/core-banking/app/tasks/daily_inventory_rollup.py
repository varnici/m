"""
Daily Inventory Metrics Rollup Job
Aggregates inventory data into InventoryMetrics for dashboard display and records daily snapshots.
Runs at 00:30 Lagos time.
"""

from datetime import date, datetime, timedelta
from typing import List

from sqlalchemy import func, select, text, desc
from sqlalchemy.orm import Session

from app.infrastructure.database import db_session
from app.models.inventory import Store, StockLevel, Product, InventorySnapshot, StockMovement
from app.models.inventory_metrics import InventoryMetrics
from app.models.user import User


def calculate_daily_inventory_rollup(target_date: date) -> None:
    """
    Calculate inventory metrics and record snapshots for all users for the given date.

    Args:
        target_date: The date to calculate metrics for.
    """
    with db_session() as session:
        try:
            # 1. Calculate and Record Store-Level Snapshots
            # We aggregate stock levels joined with products to get value and status counts
            snapshot_query = select(
                Store.id.label('store_id'),
                Store.owner_id,
                func.sum(StockLevel.quantity_on_hand * Product.cost_price_kobo).label('total_value'),
                func.sum(StockLevel.quantity_on_hand).label('total_qty'),
                func.count(Product.id).filter(StockLevel.quantity_on_hand <= Product.minimum_stock_level).label('low_stock_count'),
                func.count(Product.id).filter(StockLevel.quantity_on_hand <= 0).label('out_of_stock_count')
            ).join(
                StockLevel, Store.id == StockLevel.store_id
            ).join(
                Product, StockLevel.product_id == Product.id
            ).group_by(Store.id, Store.owner_id)

            snapshot_results = session.execute(snapshot_query).all()

            for res in snapshot_results:
                # Upsert InventorySnapshot
                existing_snapshot = session.execute(
                    select(InventorySnapshot).where(
                        InventorySnapshot.store_id == res.store_id,
                        InventorySnapshot.snapshot_date == target_date
                    )
                ).scalar_one_or_none()

                if existing_snapshot:
                    snapshot = existing_snapshot
                else:
                    snapshot = InventorySnapshot(
                        store_id=res.store_id,
                        owner_id=res.owner_id,
                        snapshot_date=target_date
                    )
                    session.add(snapshot)

                snapshot.total_inventory_value_kobo = res.total_value or 0
                snapshot.total_quantity_on_hand = res.total_qty or 0
                snapshot.low_stock_items_count = res.low_stock_count or 0
                snapshot.out_of_stock_items_count = res.out_of_stock_count or 0
                # Turnover is typically calculated at user/category level, keeping it 0 at store level for now
                snapshot.inventory_turnover_ratio = 0.0

            # Flush to ensure snapshots are in DB before turnover function calls
            session.flush()

            # 3. Aggregate for User-Level InventoryMetrics
            # Get unique users who had snapshots today
            user_ids = sorted(list(set(res.owner_id for res in snapshot_results)))

            for user_id in user_ids:
                # Aggregate store snapshots for the user
                user_totals = session.execute(
                    select(
                        func.sum(InventorySnapshot.total_inventory_value_kobo).label('total_value'),
                        func.sum(InventorySnapshot.low_stock_items_count).label('low_stock'),
                        func.sum(InventorySnapshot.out_of_stock_items_count).label('out_of_stock')
                    ).where(
                        InventorySnapshot.owner_id == user_id,
                        InventorySnapshot.snapshot_date == target_date
                    )
                ).one()

                # Calculate turnover ratio using SQL business logic function
                # This function averages snapshots over the last 30 days
                turnover_ratio = session.execute(
                    text("SELECT inventory_turnover(:owner_id, 30)"),
                    {"owner_id": user_id}
                ).scalar() or 0.0

                # Identify top selling items for the day using SQL business logic function
                top_items_data = session.execute(
                    text("SELECT sku, name, total_sold FROM best_selling_products(:owner_id, 5, :target_date, :target_date)"),
                    {"owner_id": user_id, "target_date": target_date}
                ).all()

                top_selling_json = [
                    {"sku": item.sku, "name": item.name, "quantity": int(item.total_sold)} 
                    for item in top_items_data
                ]

                # Upsert InventoryMetrics
                existing_metrics = session.execute(
                    select(InventoryMetrics).where(
                        InventoryMetrics.user_id == user_id,
                        InventoryMetrics.date == target_date
                    )
                ).scalar_one_or_none()

                if existing_metrics:
                    metrics = existing_metrics
                else:
                    metrics = InventoryMetrics(
                        user_id=user_id,
                        date=target_date
                    )
                    session.add(metrics)

                metrics.total_inventory_value_kobo = user_totals.total_value or 0
                metrics.low_stock_items = user_totals.low_stock or 0
                metrics.out_of_stock_items = user_totals.out_of_stock or 0
                metrics.inventory_turnover_ratio = float(turnover_ratio)
                metrics.top_selling_items = top_selling_json
                metrics.created_at = datetime.utcnow()

            session.commit()
            print(f"Successfully processed inventory rollup for {target_date} for {len(user_ids)} users")

        except Exception as e:
            session.rollback()
            print(f"Error in daily inventory rollup for {target_date}: {str(e)}")
            raise


def run_daily_inventory_rollup() -> None:
    """
    Main entry point for the daily inventory rollup job.
    Calculates metrics for yesterday's date.
    """
    # Calculate for yesterday (job runs early morning)
    target_date = date.today() - timedelta(days=1)
    calculate_daily_inventory_rollup(target_date)


if __name__ == "__main__":
    run_daily_inventory_rollup()

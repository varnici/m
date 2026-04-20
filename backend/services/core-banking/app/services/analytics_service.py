"""
Analytics Service
Handles complex inventory calculations and reporting using optimized SQL functions.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, text
from sqlalchemy.orm import Session
import logging

from app.schemas.inventory_schemas import (
    InventoryMetricsOut,
    ProductHealthOut,
)

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for inventory analytics and reporting."""
    
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get high-level dashboard summary using standalone SQL functions."""
        # 1. Total Inventory Value
        total_val = self.db.execute(
            text("SELECT total_inventory_value(:owner_id)"),
            {"owner_id": self.owner_id}
        ).scalar() or 0

        # Fallback if SQL function returns 0
        if total_val == 0:
            total_val = self.db.execute(
                text("""
                    SELECT SUM(sl.quantity_on_hand * p.cost_price_kobo)
                    FROM stock_levels sl
                    JOIN products p ON sl.product_id = p.id
                    WHERE p.owner_id = :owner_id
                """),
                {"owner_id": self.owner_id}
            ).scalar() or 0

        # 2. Turnover Ratio
        turnover = self.db.execute(
            text("SELECT inventory_turnover(:owner_id, 30)"),
            {"owner_id": self.owner_id}
        ).scalar() or 0

        # 3. Best Sellers
        best_sellers = self.db.execute(
            text("SELECT * FROM best_selling_products(:owner_id, 5)"),
            {"owner_id": self.owner_id}
        ).fetchall()

        # 4. Dead Stock Count
        dead_stock = self.db.execute(
            text("SELECT COUNT(*) FROM dead_stock_detection(:owner_id, 90)"),
            {"owner_id": self.owner_id}
        ).scalar() or 0

        # 5. Total Revenue & Profit (Last 30 days)
        revenue = self.db.execute(
            text("SELECT COALESCE(SUM(total_amount_kobo), 0) FROM sales_transactions WHERE owner_id = :owner_id AND transaction_date >= NOW() - INTERVAL '30 days'"),
            {"owner_id": self.owner_id}
        ).scalar() or 0

        profit = self.db.execute(
            text("""
                SELECT COALESCE(SUM((sti.quantity_sold * sti.unit_price_kobo) - (sti.quantity_sold * p.cost_price_kobo)), 0)
                FROM sales_transaction_items sti
                JOIN products p ON sti.product_id = p.id
                JOIN sales_transactions st ON sti.sales_transaction_id = st.id
                WHERE st.owner_id = :owner_id AND st.transaction_date >= NOW() - INTERVAL '30 days'
            """),
            {"owner_id": self.owner_id}
        ).scalar() or 0

        # 6. Categories Health & Count
        categories_data = self.get_category_health()
        # total_items from get_category_health matches the count needed
        for cat in categories_data:
            cat["count"] = cat.get("total_items", 0)

        return {
            "total_value_kobo": total_val,
            "total_revenue_kobo": revenue,
            "total_profit_kobo": profit,
            "turnover_ratio": float(turnover),
            "turnover_description": f"{float(turnover):.1f}x monthly turnover",
            "dead_stock_count": dead_stock,
            "best_sellers": [
                {"product_id": str(r[0]), "name": r[1], "total_sold": r[2]} 
                for r in best_sellers
            ],
            "categories": categories_data,
            "recent_transactions": self.get_recent_transactions(5)
        }

    def get_product_intelligence(self, product_id: str) -> Dict[str, Any]:
        """Get intelligence for a specific product."""
        # 1. Profit & Margin
        margin = self.db.execute(
            text("SELECT margin_percentage(:pid)"),
            {"pid": product_id}
        ).scalar() or 0

        profit = self.db.execute(
            text("SELECT profit_per_unit(:pid)"),
            {"pid": product_id}
        ).scalar() or 0

        # 2. Days Remaining
        days_left = self.db.execute(
            text("SELECT stock_days_remaining(:pid)"),
            {"pid": product_id}
        ).scalar() or 0

        # 3. Predicted Restock
        restock_qty = self.db.execute(
            text("SELECT restock_quantity_prediction(:pid)"),
            {"pid": product_id}
        ).scalar() or 0

        return {
            "margin_percentage": float(margin),
            "profit_per_unit_kobo": profit,
            "stock_days_remaining": days_left,
            "recommended_restock_qty": restock_qty
        }

    def get_category_health(self) -> List[Dict[str, Any]]:
        """Get health scores for all active categories using a single optimized query."""
        # This replaces the N+1 loop with a single aggregate query
        query = text("""
            WITH category_stats AS (
                SELECT 
                    c.id as category_id,
                    c.name,
                    COUNT(p.id) as total_items,
                    SUM(CASE WHEN sl.quantity_on_hand <= p.minimum_stock_level THEN 1 ELSE 0 END) as low_stock_items
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
                LEFT JOIN stock_levels sl ON p.id = sl.product_id
                WHERE c.owner_id = :owner_id AND c.is_active = TRUE
                GROUP BY c.id, c.name
            )
            SELECT 
                category_id,
                name,
                total_items,
                CASE 
                    WHEN total_items = 0 THEN 100
                    ELSE ROUND(((total_items - low_stock_items)::DECIMAL / total_items * 100))::INTEGER
                END as health_score
            FROM category_stats
        """)
        
        results = self.db.execute(query, {"owner_id": self.owner_id}).fetchall()
        
        return [
            {
                "category_id": str(r[0]),
                "name": r[1],
                "total_items": r[2],
                "health_score": r[3]
            }
            for r in results
        ]

    def get_supplier_performance(self) -> List[Dict[str, Any]]:
        """Get performance scores for all suppliers using a single optimized query."""
        # Single query to calculate performance metrics (fulfillment rate, delivery time)
        query = text("""
            WITH po_stats AS (
                SELECT 
                    s.id as supplier_id,
                    s.name,
                    COUNT(po.id) as total_pos,
                    AVG(EXTRACT(EPOCH FROM (po.actual_delivery_date::timestamp - po.created_at))/86400) as avg_lead_time_days,
                    SUM(CASE WHEN po.status = 'received' THEN 1 ELSE 0 END) as completed_pos
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.id = po.supplier_id
                WHERE s.owner_id = :owner_id
                GROUP BY s.id, s.name
            )
            SELECT 
                supplier_id,
                name,
                total_pos,
                CASE 
                    WHEN total_pos = 0 THEN 0
                    ELSE ROUND((completed_pos::DECIMAL / total_pos * 100))::INTEGER
                END as performance_score
            FROM po_stats
        """)
        
        results = self.db.execute(query, {"owner_id": self.owner_id}).fetchall()
        
        return [
            {
                "supplier_id": str(r[0]),
                "name": r[1],
                "total_pos": r[2],
                "performance_score": r[3]
            }
            for r in results
        ]
    def get_recent_transactions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent sales transactions with detailed metrics for the dashboard 'sheet'."""
        query = text("""
            SELECT 
                st.id,
                st.transaction_date,
                st.total_amount_kobo,
                st.notes as customer_info,
                p.name as product_name,
                sti.quantity_sold,
                sti.unit_price_kobo,
                ((sti.quantity_sold * sti.unit_price_kobo) - (sti.quantity_sold * p.cost_price_kobo)) as profit_kobo
            FROM sales_transactions st
            JOIN sales_transaction_items sti ON st.id = sti.sales_transaction_id
            JOIN products p ON sti.product_id = p.id
            WHERE st.owner_id = :owner_id
            ORDER BY st.transaction_date DESC
            LIMIT :limit
        """)
        
        results = self.db.execute(query, {"owner_id": self.owner_id, "limit": limit}).fetchall()
        
        return [
            {
                "id": str(r[0]),
                "date": r[1].isoformat() if r[1] else None,
                "amount_kobo": r[2],
                "customer": r[3] or "Guest",
                "product_name": r[4],
                "quantity": r[5],
                "unit_price_kobo": r[6],
                "profit_kobo": r[7]
            }
            for r in results
        ]

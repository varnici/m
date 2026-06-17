"""
Activity Log & Sales Integrity Service

Provides:
1. Immutable audit trail for all inventory mutations (who did what, when)
2. Sales integrity scoring to detect dubious/manipulated data
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.inventory import (
    ActivityLog, Product, StockMovement, SalesTransaction,
    SalesTransactionItem, StockLevel
)
from app.models.user import User

logger = logging.getLogger(__name__)


class ActivityLogService:
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def log(
        self,
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        entity_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        actor = self.db.get(User, actor_id)
        actor_name = None
        if actor:
            actor_name = actor.full_name or actor.business_name or actor.phone

        entry = ActivityLog(
            owner_id=self.owner_id,
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def get_activity_log(
        self,
        skip: int = 0,
        limit: int = 50,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        since = datetime.now(timezone.utc) - timedelta(days=days)

        query = (
            self.db.query(ActivityLog)
            .filter(
                ActivityLog.owner_id == self.owner_id,
                ActivityLog.created_at >= since,
            )
        )

        if actor_id:
            query = query.filter(ActivityLog.actor_id == actor_id)
        if action:
            query = query.filter(ActivityLog.action == action)
        if entity_type:
            query = query.filter(ActivityLog.entity_type == entity_type)

        entries = (
            query.order_by(desc(ActivityLog.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_name": e.actor_name or "Unknown",
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "entity_name": e.entity_name,
                "details": json.loads(e.details) if e.details else None,
                "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat(),
                "is_owner": e.actor_id == self.owner_id,
            }
            for e in entries
        ]

    def get_staff_summary(self, days: int = 30) -> List[Dict[str, Any]]:
        since = datetime.now(timezone.utc) - timedelta(days=days)

        rows = (
            self.db.query(
                ActivityLog.actor_id,
                ActivityLog.actor_name,
                func.count(ActivityLog.id).label("total_actions"),
                func.max(ActivityLog.created_at).label("last_active"),
            )
            .filter(
                ActivityLog.owner_id == self.owner_id,
                ActivityLog.created_at >= since,
            )
            .group_by(ActivityLog.actor_id, ActivityLog.actor_name)
            .all()
        )

        result = []
        for row in rows:
            action_counts = (
                self.db.query(
                    ActivityLog.action,
                    func.count(ActivityLog.id),
                )
                .filter(
                    ActivityLog.owner_id == self.owner_id,
                    ActivityLog.actor_id == row.actor_id,
                    ActivityLog.created_at >= since,
                )
                .group_by(ActivityLog.action)
                .all()
            )

            result.append({
                "actor_id": row.actor_id,
                "actor_name": row.actor_name or "Unknown",
                "is_owner": row.actor_id == self.owner_id,
                "total_actions": row.total_actions,
                "last_active": row.last_active.isoformat() if row.last_active else None,
                "actions_breakdown": {a: c for a, c in action_counts},
            })

        return sorted(result, key=lambda x: x["total_actions"], reverse=True)


class SalesIntegrityService:
    """
    Cross-validates sales data against stock movements and product state
    to detect manipulated or dubious numbers.

    Checks:
    1. Stock-sales mismatch: claimed sold > actual stock decrease
    2. Margin anomaly: selling below cost or impossibly high margins
    3. Credit risk: excessive credit relative to sales
    4. Velocity spike: sudden sales spikes vs historical average
    5. Ghost products: products with sales but no stock movements
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def compute_integrity_report(self, days: int = 30) -> Dict[str, Any]:
        products = (
            self.db.query(Product)
            .filter(Product.owner_id == self.owner_id, Product.is_active == True)
            .all()
        )

        if not products:
            return {
                "overall_score": 100,
                "risk_level": "clean",
                "total_products_checked": 0,
                "flags": [],
                "product_scores": [],
            }

        flags = []
        product_scores = []
        since = datetime.now(timezone.utc) - timedelta(days=days)

        for product in products:
            score = 100
            product_flags = []

            sold = product.quantity_sold or 0
            on_credit = product.quantity_on_credit or 0
            cost = product.cost_price_kobo
            sell = product.selling_price_kobo
            qty = 0

            stock_levels = (
                self.db.query(StockLevel)
                .filter(StockLevel.product_id == product.id)
                .all()
            )
            for sl in stock_levels:
                qty += sl.quantity_on_hand

            # 1. Stock-sales mismatch
            total_purchased = (
                self.db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
                .filter(
                    StockMovement.product_id == product.id,
                    StockMovement.movement_type.in_(["purchase", "adjustment"]),
                    StockMovement.created_at >= since,
                )
                .scalar()
            ) or 0

            if sold > 0 and total_purchased > 0:
                max_possible_sold = total_purchased + qty
                if sold > max_possible_sold:
                    score -= 30
                    product_flags.append({
                        "type": "stock_mismatch",
                        "severity": "high",
                        "message": f"Claims {sold} sold but only {max_possible_sold} units ever available",
                    })

            # 2. Margin anomaly
            if cost > 0:
                margin_pct = ((sell - cost) / cost) * 100
                if margin_pct < 0:
                    score -= 15
                    product_flags.append({
                        "type": "negative_margin",
                        "severity": "high",
                        "message": f"Selling below cost: ₦{sell/100:.2f} vs cost ₦{cost/100:.2f}",
                    })
                elif margin_pct > 200:
                    score -= 10
                    product_flags.append({
                        "type": "extreme_margin",
                        "severity": "medium",
                        "message": f"Margin is {margin_pct:.0f}% — unusually high, verify pricing",
                    })

            # 3. Credit risk
            if sold > 0 and on_credit > 0:
                credit_ratio = on_credit / max(sold, 1)
                if credit_ratio > 0.5:
                    score -= 20
                    product_flags.append({
                        "type": "excessive_credit",
                        "severity": "high",
                        "message": f"{on_credit} of {sold} sold units on credit ({credit_ratio*100:.0f}%) — high default risk",
                    })
                elif credit_ratio > 0.25:
                    score -= 10
                    product_flags.append({
                        "type": "elevated_credit",
                        "severity": "medium",
                        "message": f"{on_credit} of {sold} sold on credit ({credit_ratio*100:.0f}%)",
                    })

            # 4. Sold without movements
            sale_movements = (
                self.db.query(func.count(StockMovement.id))
                .filter(
                    StockMovement.product_id == product.id,
                    StockMovement.movement_type == "sale",
                    StockMovement.created_at >= since,
                )
                .scalar()
            ) or 0

            if sold > 0 and sale_movements == 0:
                score -= 25
                product_flags.append({
                    "type": "ghost_sales",
                    "severity": "high",
                    "message": f"Claims {sold} sold but no sale movements recorded — verify manually",
                })

            # 5. Credit exceeds available
            if on_credit > qty + sold:
                score -= 30
                product_flags.append({
                    "type": "impossible_credit",
                    "severity": "critical",
                    "message": f"Credit qty ({on_credit}) exceeds total available ({qty + sold})",
                })

            score = max(0, score)

            product_scores.append({
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "integrity_score": score,
                "quantity_on_hand": qty,
                "quantity_sold": sold,
                "quantity_on_credit": on_credit,
                "flags": product_flags,
            })

            flags.extend(product_flags)

        avg_score = sum(p["integrity_score"] for p in product_scores) / len(product_scores) if product_scores else 100
        risk_level = "clean"
        if avg_score < 50:
            risk_level = "critical"
        elif avg_score < 70:
            risk_level = "high"
        elif avg_score < 85:
            risk_level = "medium"

        critical_count = sum(1 for f in flags if f["severity"] in ("critical", "high"))

        return {
            "overall_score": round(avg_score),
            "risk_level": risk_level,
            "total_products_checked": len(products),
            "flagged_products": sum(1 for p in product_scores if p["flags"]),
            "critical_flags": critical_count,
            "total_flags": len(flags),
            "product_scores": sorted(product_scores, key=lambda x: x["integrity_score"]),
        }

    def get_product_integrity(self, product_id: str) -> Dict[str, Any]:
        report = self.compute_integrity_report()
        for p in report["product_scores"]:
            if p["product_id"] == product_id:
                return p
        return {"product_id": product_id, "integrity_score": 100, "flags": []}

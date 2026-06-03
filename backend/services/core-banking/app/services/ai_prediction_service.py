"""
AI Prediction Service
Handles machine learning driven insights, forecasts, and anomaly detections.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from sqlalchemy import desc, text
from sqlalchemy.orm import Session
import logging

from app.schemas.inventory_schemas import AIInsightsOut

logger = logging.getLogger(__name__)

class AIPredictionService:
    """Service for AI-driven inventory intelligence."""
    
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def get_insights(self) -> AIInsightsOut:
        """Get latest AI generated insights from the database."""
        # Query the ai_predictions table for latest results
        predictions = self.db.execute(
            text("""
                SELECT DISTINCT ON (prediction_type, product_id) 
                    prediction_type, product_id, value, value_float, confidence_score, metadata
                FROM ai_predictions
                WHERE owner_id = :owner_id
                ORDER BY prediction_type, product_id, created_at DESC
            """),
            {"owner_id": self.owner_id}
        ).fetchall()

        anomalies = []
        forecasts = []
        restock_recs = []

        for p in predictions:
            ptype = p[0]
            item = {
                "product_id": str(p[1]),
                "score": float(p[4]),
                "details": p[5]
            }
            
            if ptype == 'anomaly_detection':
                anomalies.append(item)
            elif ptype == 'demand_forecast':
                item["predicted_qty"] = int(p[2])
                forecasts.append(item)
            elif ptype == 'restock_recommendation':
                item["recommended_qty"] = int(p[2])
                restock_recs.append(item)

        return AIInsightsOut(
            owner_id=self.owner_id,
            anomalies=anomalies,
            forecasts=forecasts,
            restock_recommendations=restock_recs,
            generated_at=datetime.utcnow()
        )

    def get_product_forecast(self, product_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Get granular forecast for a specific product."""
        # This would call the ML pipeline in a real scenario, 
        # or pull from pre-calculated cache in the DB.
        results = self.db.execute(
            text("""
                SELECT prediction_date, value 
                FROM ai_predictions 
                WHERE product_id = :pid AND prediction_type = 'demand_forecast'
                ORDER BY prediction_date ASC
                LIMIT :days
            """),
            {"pid": product_id, "days": days}
        ).fetchall()

        return [{"date": str(r[0]), "qty": r[1]} for r in results]

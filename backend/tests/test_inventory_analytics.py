import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from app.services.analytics_service import AnalyticsService
from app.services.ai_prediction_service import AIPredictionService

@pytest.fixture
def mock_db():
    return MagicMock(spec=Session)

@pytest.fixture
def owner_id():
    return "test-owner-123"

def test_analytics_dashboard_summary(mock_db, owner_id):
    # Setup mock returns
    mock_db.execute.return_value.scalar.side_effect = [1000000, 4.5, 12] # Value, Turnover, Dead Stock
    mock_db.execute.return_value.fetchall.return_value = [] # Best Sellers
    
    service = AnalyticsService(mock_db, owner_id)
    summary = service.get_dashboard_summary()
    
    assert summary["total_inventory_value_kobo"] == 1000000
    assert summary["turnover_ratio"] == 4.5
    assert summary["dead_stock_count"] == 12

def test_ai_prediction_insights(mock_db, owner_id):
    # Mock predictions fetchall
    mock_db.execute.return_value.fetchall.return_value = [
        ('anomaly_detection', 'prod_1', 0, 0, 0.95, {'reason': 'High variance'}),
        ('demand_forecast', 'prod_1', 150, 0, 0.88, {}),
        ('restock_recommendation', 'prod_1', 50, 0, 0.90, {})
    ]
    
    service = AIPredictionService(mock_db, owner_id)
    insights = service.get_insights()
    
    assert len(insights.anomalies) == 1
    assert len(insights.forecasts) == 1
    assert len(insights.restock_recommendations) == 1
    assert insights.forecasts[0].predicted_qty == 150

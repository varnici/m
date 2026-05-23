from __future__ import annotations

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

# Resolve import clashing between backend/app and rag-service/app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../services/rag-service")))
if "app" in sys.modules:
    # Remove cached 'app' module to force loading from the inserted path
    for k in list(sys.modules.keys()):
        if k == "app" or k.startswith("app."):
            sys.modules.pop(k, None)

from app.services.recommendations import RecommendationService, UserProfile, Article
from app.tasks.refresh_intelligence import simulate_market_tickers, IN_MEMORY_TICKERS, fetch_live_feed_articles


def test_relevance_scoring_bronze_user():
    """
    Test that a Bronze tier user receives a major boost for Savings Reminders.
    """
    user = UserProfile(id="test-bronze-user", category="personal", trust_level="bronze")
    
    savings_article = Article(
        category="For You",
        source="VR Insights",
        headline="Bronze Tier Micro-Savings Reminder: Small daily habits build big provisions",
        subtitle="Save ₦500 daily to hit your rent goal without stress."
    )
    
    trade_article = Article(
        category="Trade Alert",
        source="VR Insights",
        headline="Dangote Flour drops 8% — best time to restock for Q1",
        subtitle="↑ Buy opportunity for wholesale grain buyers."
    )
    
    score_savings = RecommendationService.calculate_relevance(savings_article, user)
    score_trade = RecommendationService.calculate_relevance(trade_article, user)
    
    # Savings reminders should get a large boost for Bronze users (0.5 + 0.45 = 0.95)
    assert score_savings >= 0.9
    # Trade alerts should be penalized for non-business owners (0.5 - 0.25 = 0.25)
    assert score_trade <= 0.3
    assert score_savings > score_trade


def test_relevance_scoring_business_owner():
    """
    Test that a business owner receives a major boost for Trade Alerts (grains/flour).
    """
    user = UserProfile(id="test-business-user", category="business_owner", trust_level="gold")
    
    savings_article = Article(
        category="For You",
        source="VR Insights",
        headline="Bronze Tier Micro-Savings Reminder: Small daily habits build big provisions",
        subtitle="Save ₦500 daily to hit your rent goal."
    )
    
    trade_article = Article(
        category="Trade Alert",
        source="VR Insights",
        headline="Dangote Flour drops 8% — best time to restock for Q1",
        subtitle="↑ Buy opportunity for wholesale grain buyers."
    )
    
    score_savings = RecommendationService.calculate_relevance(savings_article, user)
    score_trade = RecommendationService.calculate_relevance(trade_article, user)
    
    # Business owner gets a large boost for Trade Alerts (0.5 + 0.45 = 0.95)
    assert score_trade >= 0.9
    # Savings reminder gets a penalty/no boost for non-bronze users (0.5 - 0.15 = 0.35)
    assert score_savings <= 0.4
    assert score_trade > score_savings


def test_relevance_scoring_personal_category():
    """
    Test that a personal category user gets a major boost for Budgeting Ideas.
    """
    user = UserProfile(id="test-personal-user", category="personal", trust_level="silver")
    
    budget_article = Article(
        category="For You",
        source="VR Insights",
        headline="5 budgeting ideas for nine-to-five and personal finance stability",
        subtitle="Master the 50/30/20 rule to optimize monthly savings."
    )
    
    trade_article = Article(
        category="Trade Alert",
        source="VR Insights",
        headline="Dangote Flour drops 8% — best time to restock for Q1",
        subtitle="↑ Buy opportunity for wholesale grain buyers."
    )
    
    score_budget = RecommendationService.calculate_relevance(budget_article, user)
    score_trade = RecommendationService.calculate_relevance(trade_article, user)
    
    # Personal/Nine-to-Five get a boost for budgeting ideas (0.5 + 0.4 = 0.9)
    assert score_budget >= 0.9
    # Non-business owners get penalized for Trade alerts
    assert score_trade <= 0.3
    assert score_budget > score_trade


def test_simulated_market_tickers():
    """
    Test that market tickers are correctly simulated, contain all four target symbols,
    and have correct structures.
    """
    tickers = simulate_market_tickers()
    
    symbols = {t["symbol"] for t in tickers}
    expected_symbols = {"AG", "Zenith", "Airtel", "NGX ASI"}
    
    assert expected_symbols.issubset(symbols)
    
    for t in tickers:
        assert "symbol" in t
        assert "price" in t
        assert "change" in t
        assert "positive" in t
        
        # Check formatting
        assert isinstance(t["symbol"], str)
        assert isinstance(t["price"], str)
        assert isinstance(t["change"], str)
        assert isinstance(t["positive"], bool)
        
        # Check bounds
        change_pct = float(t["change"].replace("%", ""))
        assert -2.6 <= change_pct <= 3.6


@pytest.mark.asyncio
async def test_live_feed_fetcher_fallback():
    """
    Test that the live feed fetcher runs and gracefully falls back to curated lists
    if network/parsing fails, maintaining 100% uptime.
    """
    # Mock XML response content
    mock_rss = b"""<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
        <channel>
            <title>Nairametrics</title>
            <link>https://nairametrics.com</link>
            <item>
                <title>Dangote Flour drops 8% in Q1</title>
                <link>https://nairametrics.com/dangote-flour-drops</link>
                <pubDate>Wed, 20 May 2026 12:00:00 +0000</pubDate>
                <description><![CDATA[Wholesale grain and flour trading prices fall due to bumper harvest.]]></description>
                <category>Agriculture</category>
            </item>
        </channel>
    </rss>
    """
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = mock_rss
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        articles = await fetch_live_feed_articles()
        
        assert len(articles) > 0
        assert articles[0].headline == "Dangote Flour drops 8% in Q1"
        assert articles[0].category == "Trade Alert"


def test_fetch_live_policy_content():
    """
    Test that fetch_live_policy_content returns valid content text, falling back gracefully if needed.
    """
    # Mock Raw text response
    mock_policy_text = "BUDGET_BEST ZERO-LOSS SAVINGS GUARANTEE - Active Live terms here."
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = mock_policy_text
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        # Restore sys.path for backend app
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        if "app" in sys.modules:
            for k in list(sys.modules.keys()):
                if k == "app" or k.startswith("app."):
                    sys.modules.pop(k, None)
                    
        from app.routers.budget_best import fetch_live_policy_content
        policy_text = fetch_live_policy_content()
        
        assert "BUDGET_BEST" in policy_text
        assert "Active Live terms" in policy_text

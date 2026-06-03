from __future__ import annotations

import logging
import random
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.services.personalization import supabase
from app.services.recommendations import Article, CURATED_FALLBACK_ARTICLES

logger = logging.getLogger(__name__)

# Thread-safe/process-safe in-memory cache fallbacks
IN_MEMORY_TICKERS: List[Dict[str, Any]] = [
    {"symbol": "AG", "price": "₦20.50", "change": "+1.90%", "positive": True},
    {"symbol": "Zenith", "price": "₦36.15", "change": "-0.90%", "positive": False},
    {"symbol": "Airtel", "price": "₦2,200.00", "change": "+0.50%", "positive": True},
    {"symbol": "NGX ASI", "price": "98,450.20", "change": "+1.20%", "positive": True},
]

IN_MEMORY_ARTICLES: List[Article] = list(CURATED_FALLBACK_ARTICLES)


def simulate_market_tickers() -> List[Dict[str, Any]]:
    """
    Simulates a live market ticker feed for AG, Zenith, Airtel, and NGX ASI.
    Calculates random daily fluctuations and stores results in Supabase or updates IN_MEMORY_TICKERS.
    """
    global IN_MEMORY_TICKERS

    base_prices = {
        "AG": 20.50,
        "Zenith": 36.15,
        "Airtel": 2200.00,
        "NGX ASI": 98450.20,
    }

    updated_tickers = []
    for symbol, base_price in base_prices.items():
        # Fluctuations between -2.5% and +3.5%
        change_pct = random.uniform(-2.5, 3.5)
        new_price = base_price * (1 + (change_pct / 100))
        positive = change_pct >= 0
        
        change_str = f"{'+' if positive else ''}{change_pct:.2f}%"
        
        # Format price nicely
        if symbol == "NGX ASI":
            price_str = f"{new_price:,.2f}"
        else:
            price_str = f"₦{new_price:,.2f}"

        ticker_item = {
            "symbol": symbol,
            "price": price_str,
            "change": change_str,
            "positive": positive,
            "price_kobo": int(new_price * 100) if symbol != "NGX ASI" else int(new_price),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        updated_tickers.append(ticker_item)

    # 1. Try to persist in Supabase (if available)
    if supabase is not None:
        try:
            for item in updated_tickers:
                data = {
                    "symbol": item["symbol"],
                    "price_kobo": item["price_kobo"],
                    "price_change_percent": float(item["change"].replace("%", "")),
                    "last_updated": item["last_updated"],
                }
                # Upsert based on symbol constraint
                supabase.table("market_tickers").upsert(data, on_conflict="symbol").execute()
        except Exception as e:
            logger.warning(f"Failed to persist tickers in Supabase: {e}. Falling back to memory.")

    # 2. Always update local memory cache
    IN_MEMORY_TICKERS = [
        {
            "symbol": t["symbol"],
            "price": t["price"],
            "change": t["change"],
            "positive": t["positive"],
        }
        for t in updated_tickers
    ]
    
    return IN_MEMORY_TICKERS


async def fetch_live_feed_articles() -> List[Article]:
    """
    Fetches real-time financial articles from live RSS feeds of Nairametrics and BusinessDay.
    Falls back to curated lists on connection/parsing errors.
    """
    global IN_MEMORY_ARTICLES

    feeds = [
        {"url": "https://nairametrics.com/feed/", "source": "Nairametrics"},
        {"url": "https://businessday.ng/feed/", "source": "BusinessDay NG"},
    ]

    fetched_articles = []
    
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for feed in feeds:
            try:
                res = await client.get(feed["url"])
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    items = root.findall(".//item")
                    
                    for item in items[:10]:  # Take top 10 from each feed
                        title_el = item.find("title")
                        link_el = item.find("link")
                        pub_date_el = item.find("pubDate")
                        desc_el = item.find("description")
                        cat_el = item.find("category")

                        title = title_el.text if title_el is not None else ""
                        link = link_el.text if link_el is not None else ""
                        pub_date_str = pub_date_el.text if pub_date_el is not None else ""
                        description = desc_el.text if desc_el is not None else ""
                        category_tag = cat_el.text if cat_el is not None else "News"

                        if not title:
                            continue

                        # Map RSS category tag to our strict categories
                        category = "News"
                        title_lower = title.lower()
                        if "rate" in title_lower or "cbn" in title_lower or "policy" in title_lower:
                            category = "CBN Update"
                        elif "stock" in title_lower or "ngx" in title_lower or "shares" in title_lower:
                            category = "Stocks"
                        elif "flour" in title_lower or "price" in title_lower or "trade" in title_lower or "buy" in title_lower:
                            category = "Trade Alert"
                        elif category_tag and "alert" in category_tag.lower():
                            category = "Trade Alert"

                        # Parse RSS date formatting
                        published_at = datetime.now(timezone.utc)
                        if pub_date_str:
                            try:
                                # Standard RSS: 'Wed, 21 May 2026 12:00:00 +0000'
                                published_at = datetime.strptime(
                                    pub_date_str[:25].strip(), "%a, %d %b %Y %H:%M:%S"
                                ).replace(tzinfo=timezone.utc)
                            except Exception:
                                pass

                        # Clean description text from HTML tags
                        clean_desc = description
                        if clean_desc and "<" in clean_desc:
                            try:
                                # Strip HTML
                                clean_desc = ET.fromstring(f"<p>{description}</p>").text or ""
                            except Exception:
                                # Fallback basic stripping
                                import re
                                clean_desc = re.sub(r"<[^>]+>", "", description)[:150] + "..."

                        fetched_articles.append(
                            Article(
                                category=category,
                                source=feed["source"],
                                headline=title[:255],
                                subtitle=(clean_desc or "Latest market news update.")[:255],
                                article_url=link,
                                published_at=published_at,
                            )
                        )
            except Exception as e:
                logger.warning(f"Error fetching/parsing feed {feed['url']}: {e}")

    # If we successfully parsed any articles, update cache and db
    if fetched_articles:
        # Sort by publication date
        fetched_articles.sort(key=lambda a: -a.published_at.timestamp())
        
        # Upsert into Supabase (if available)
        if supabase is not None:
            try:
                for article in fetched_articles[:20]:
                    data = {
                        "category": article.category,
                        "source": article.source,
                        "headline": article.headline,
                        "subtitle": article.subtitle,
                        "article_url": article.article_url,
                        "published_at": article.published_at.isoformat(),
                    }
                    # Clean up duplicates by checking headline matching in database
                    # Simple insert to build history, scheduled job trims later
                    supabase.table("intelligence_articles").insert(data).execute()
            except Exception as e:
                logger.warning(f"Failed to persist articles in Supabase: {e}")

        # Update in-memory cache with the new feed items mixed with curated alerts
        IN_MEMORY_ARTICLES = fetched_articles[:20] + CURATED_FALLBACK_ARTICLES
        
    return IN_MEMORY_ARTICLES


async def refresh_all_intelligence() -> Dict[str, Any]:
    """
    Executes a complete scheduled sync of both market tickers and news articles.
    """
    logger.info("Executing intelligence feed refresh...")
    tickers = simulate_market_tickers()
    articles = await fetch_live_feed_articles()
    
    return {
        "status": "success",
        "tickers_updated": len(tickers),
        "articles_updated": len(articles),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

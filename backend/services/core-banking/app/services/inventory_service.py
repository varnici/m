"""
VentureRoot — Inventory Service
Computer vision stock import, auto-restock triggers, dead stock detection,
price intelligence, expiry tracking for pharmaceutical items.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import httpx

from .core.config import settings
from .models.inventory import InventoryItem, StockMovement, MovementType
from .services.cv_scanner import ComputerVisionScanner
from .services.price_intelligence import PriceIntelligenceService
from .infrastructure.database import get_db

app = FastAPI(title="VentureRoot Inventory Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

cv_scanner = ComputerVisionScanner()
price_intel = PriceIntelligenceService()

AUTO_RESTOCK_THRESHOLD_PCT = 0.10   # 10% of holding qty
DEAD_STOCK_DAYS            = 14     # no sales in 14 days = dead stock
PHARMA_EXPIRY_REMOVE_DAYS  = 60
PHARMA_EXPIRY_ALERT_DAYS   = 90


# ── Schemas ───────────────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    sku: str
    product_name: str
    category: str
    brand: str
    unit_of_measure: str
    quantity_on_hand: int
    reorder_threshold: int
    cost_price_per_unit: float
    selling_price_per_unit: float
    expiry_date: Optional[str] = None
    nafdac_number: Optional[str] = None

class QuantityUpdate(BaseModel):
    quantity: int
    reason: str  # 'sale' | 'restock' | 'damage' | 'theft' | 'adjustment'

class ScanRequest(BaseModel):
    image_base64: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/inventory")
async def get_stock(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    items = db.query(InventoryItem).filter(InventoryItem.user_id == user_id).all()
    return _enrich_items(items)


@app.post("/inventory")
async def add_item(
    payload: InventoryItemCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    existing = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.sku == payload.sku,
    ).first()
    if existing:
        raise HTTPException(400, f"SKU {payload.sku} already exists. Use PUT to update quantity.")

    item = InventoryItem(
        user_id=user_id,
        **payload.dict(),
        status=_compute_status(payload.quantity_on_hand, payload.reorder_threshold, payload.expiry_date),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Check if pharmaceutical — trigger NAFDAC verification in background
    if payload.nafdac_number:
        background_tasks.add_task(_verify_nafdac_in_background, item.id, payload.nafdac_number)

    return item


@app.put("/inventory/{sku}/quantity")
async def update_quantity(
    sku: str,
    payload: QuantityUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    item = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.sku == sku,
    ).first()
    if not item:
        raise HTTPException(404, f"SKU {sku} not found in inventory")

    old_qty = item.quantity_on_hand
    item.quantity_on_hand = payload.quantity

    # Log the movement
    movement = StockMovement(
        user_id=user_id,
        sku=sku,
        movement_type=MovementType(payload.reason),
        quantity_before=old_qty,
        quantity_after=payload.quantity,
        delta=payload.quantity - old_qty,
    )
    db.add(movement)

    item.status = _compute_status(item.quantity_on_hand, item.reorder_threshold, item.expiry_date)
    db.commit()
    db.refresh(item)

    # Auto-restock check — runs every time quantity is reduced
    if payload.reason == "sale":
        background_tasks.add_task(_check_auto_restock, user_id, sku, item, db)

    return item


@app.post("/inventory/scan")
async def scan_inventory(
    payload: ScanRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    AI camera inventory import.
    User pans camera — CV reads labels, estimates quantities, builds stock ledger.
    Also serves as advance verification scan (confirms physical stock matches ledger).
    """
    results = await cv_scanner.scan_shelf(payload.image_base64)

    # Enrich with platform product database match
    enriched = []
    for detection in results:
        platform_match = await _match_to_platform_catalogue(detection.get("text_detected", ""))
        enriched.append({
            "sku":           platform_match.get("sku") if platform_match else None,
            "name":          detection.get("product_name") or platform_match.get("name", "Unknown"),
            "brand":         platform_match.get("brand") if platform_match else None,
            "estimated_qty": detection.get("estimated_qty", 0),
            "confidence":    detection.get("confidence", 0.0),
            "needs_confirm": detection.get("confidence", 0.0) < 0.75,
            "label_obscured": detection.get("label_obscured", False),
        })

    return {"detected": enriched}


@app.get("/inventory/alerts/low-stock")
async def get_low_stock_alerts(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Returns items at or below auto-restock threshold."""
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.status.in_(["low_stock", "out_of_stock"]),
    ).all()
    return items


@app.get("/inventory/{sku}/price-intelligence")
async def get_price_intelligence(
    sku: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    AI Cost Leakage Detector:
    Compares user's purchase price vs platform market average.
    Returns variance % and monthly savings opportunity.
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.sku == sku,
    ).first()
    if not item:
        raise HTTPException(404, "SKU not found")

    intel = await price_intel.analyse(
        sku=sku,
        user_cost=item.cost_price_per_unit,
        user_sell=item.selling_price_per_unit,
        user_monthly_volume=await _get_monthly_volume(user_id, sku, db),
    )

    return {
        "platform_avg_cost":  intel["platform_avg_cost"],
        "user_cost":          item.cost_price_per_unit,
        "variance_pct":       intel["variance_pct"],
        "monthly_savings_opportunity": intel["monthly_savings"],
        "platform_avg_sell":  intel["platform_avg_sell"],
        "user_sell":          item.selling_price_per_unit,
        "suggested_sell":     intel["suggested_sell"],
        "margin_vs_avg":      intel["margin_vs_avg"],
        "suggestion":         intel["suggestion"],
        "cheaper_suppliers":  intel.get("cheaper_suppliers", []),
    }


@app.put("/inventory/{sku}/reorder-threshold")
async def set_reorder_threshold(
    sku: str,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    item = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.sku == sku,
    ).first()
    if not item:
        raise HTTPException(404, "SKU not found")
    item.reorder_threshold = payload["threshold"]
    db.commit()
    db.refresh(item)
    return item


@app.post("/inventory/{sku}/restock")
async def trigger_restock(
    sku: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Manually triggers auto-restock for a SKU.
    Passes to core-banking advance engine.
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.sku == sku,
    ).first()
    if not item:
        raise HTTPException(404, "SKU not found")

    advance_result = await _request_product_advance(user_id, sku, item)

    if advance_result.get("approved"):
        item.status = "restocking"
        db.commit()
        background_tasks.add_task(_notify_restock_initiated, user_id, sku, advance_result)
        return {"advance_id": advance_result["advance_id"], "message": "Restock initiated. Your order has been placed."}
    else:
        raise HTTPException(400, f"Auto-restock not available: {advance_result.get('reason', 'insufficient credit')}")


@app.get("/inventory/dead-stock")
async def get_dead_stock(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Items with no sales in DEAD_STOCK_DAYS — returns clearance price suggestions."""
    dead_items = await _identify_dead_stock(user_id, db)
    return [
        {
            **item.__dict__,
            "days_since_last_sale": item.days_since_last_sale,
            "suggested_clearance_price": round(item.cost_price_per_unit * 1.05, 2),  # 5% above cost
            "estimated_clearing_time": "3–5 days at this price",
        }
        for item in dead_items
    ]


# ── Background tasks ──────────────────────────────────────────────────────────

async def _check_auto_restock(user_id: str, sku: str, item: InventoryItem, db: Session):
    """
    Called after every sale. Checks if stock has fallen below 10% threshold.
    If yes AND credit headroom exists → autonomously initiates advance + order.
    This is the core 'agentic AI' behaviour described in the platform spec.
    """
    holding_qty = item.reorder_threshold * 10  # estimate normal holding as 10x threshold
    threshold = holding_qty * AUTO_RESTOCK_THRESHOLD_PCT

    if item.quantity_on_hand <= threshold:
        advance_result = await _request_product_advance(user_id, sku, item)
        if advance_result.get("approved"):
            item.status = "restocking"
            db.commit()
            await _notify_user(user_id, {
                "type":  "restock_triggered",
                "title": "Auto-restock activated",
                "body":  f"Your {item.product_name} is running low. We've placed a restock order automatically.",
            })


async def _verify_nafdac_in_background(item_id: str, nafdac_number: str):
    """Verify NAFDAC on pharmaceutical items — blocks listing if invalid."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.HEALTH_SERVICE_URL}/health/nafdac/verify/{nafdac_number}",
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("registration_status") != "valid":
                await _block_pharmaceutical_item(item_id, "NAFDAC registration invalid or expired")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_status(qty: int, threshold: int, expiry_date: Optional[str]) -> str:
    if expiry_date:
        days_to_expiry = (datetime.strptime(expiry_date, "%Y-%m-%d") - datetime.utcnow()).days
        if days_to_expiry <= PHARMA_EXPIRY_ALERT_DAYS:
            return "near_expiry"
    if qty <= 0:
        return "out_of_stock"
    if qty <= threshold:
        return "low_stock"
    return "in_stock"

def _enrich_items(items: list) -> list:
    """Add computed fields: days_of_stock, margin_pct."""
    return [
        {
            **item.__dict__,
            "margin_pct": round(
                (item.selling_price_per_unit - item.cost_price_per_unit) / max(item.selling_price_per_unit, 1) * 100, 1
            ),
        }
        for item in items
    ]

async def _match_to_platform_catalogue(text: str) -> Optional[dict]: ...
async def _get_monthly_volume(user_id: str, sku: str, db: Session) -> int: ...
async def _request_product_advance(user_id: str, sku: str, item: InventoryItem) -> dict: ...
async def _notify_restock_initiated(user_id: str, sku: str, advance: dict): ...
async def _notify_user(user_id: str, notification: dict): ...
async def _identify_dead_stock(user_id: str, db: Session) -> list: ...
async def _block_pharmaceutical_item(item_id: str, reason: str): ...

def get_current_user_id() -> str: ...
"""
Admin Metrics API — platform-wide financial health dashboard.
All endpoints require a valid JWT; add role-check middleware to restrict to admins.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api import deps
from app.models.platform_metrics import DailySystemMetrics
from app.tasks.daily_platform_metrics import compute_daily_snapshot

router = APIRouter()


# ── Response schemas ──────────────────────────────────────────────────────────

class MetricStatus(BaseModel):
    value: float
    status: str          # green / amber / red
    threshold_green: str
    threshold_amber: str
    unit: str


class PlatformSnapshot(BaseModel):
    snapshot_date: date

    # Risk
    npl:  MetricStatus
    drp:  MetricStatus
    stv:  MetricStatus

    # Liquidity
    elr:  MetricStatus
    wam_investor_months: float
    wam_merchant_months: float
    wam_safe: bool          # investor WAM > merchant WAM
    system_liquidity_reserve: float

    # Operational
    ofct: MetricStatus
    hpfr: MetricStatus

    # Financial
    total_active_portfolio: float
    total_merchant_interest_collected: float
    platform_net_margin: float
    breakeven_volume_ngn: float
    monthly_operating_cost: float
    total_unclaimed_dividends: float

    # Alerts
    alerts: List[str]


class HistoryPoint(BaseModel):
    date: date
    npl_rate: float
    drp_coverage_ratio: float
    early_liquidation_rate: float
    stock_turnover_avg_days: float
    total_active_portfolio: float
    platform_net_margin: float


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_snapshot(row: DailySystemMetrics) -> PlatformSnapshot:
    alerts: List[str] = []

    npl = float(row.npl_rate)
    drp = float(row.drp_coverage_ratio)
    elr = float(row.early_liquidation_rate)
    ofct = float(row.ofct_avg_hours)
    stv = float(row.stock_turnover_avg_days)
    hpfr = float(row.hpfr_rate)
    wam_inv = float(row.wam_investor_months)
    wam_mer = float(row.wam_merchant_months)

    if row.npl_status == "red":
        alerts.append(f"CRITICAL: NPL rate at {npl:.2f}% exceeds 4% — pause matching for affected clusters.")
    elif row.npl_status == "amber":
        alerts.append(f"WARNING: NPL rate at {npl:.2f}% — tighten merchant vetting criteria.")

    if row.drp_status in ("amber", "red"):
        alerts.append(f"WARNING: DRP coverage ratio at {drp:.2f}x — below 1.5x safety threshold.")

    if row.elr_status in ("amber", "red"):
        alerts.append(f"WARNING: Early liquidation rate at {elr:.2f}% — raise early-exit penalty to 5%.")

    if row.ofct_status in ("amber", "red"):
        alerts.append(f"WARNING: Avg order fulfillment at {ofct:.1f}h — SLA breach increases default risk.")

    if stv > 18:
        alerts.append(f"WARNING: Avg stock turnover {stv:.1f} days — merchants with STV > 18 days must be demoted.")

    if wam_inv <= wam_mer:
        alerts.append("CRITICAL: Investor WAM shorter than merchant cycle WAM — liquidity mismatch risk.")

    return PlatformSnapshot(
        snapshot_date=row.snapshot_date,
        npl=MetricStatus(value=npl, status=row.npl_status,
                         threshold_green="< 2%", threshold_amber="2–4%", unit="%"),
        drp=MetricStatus(value=drp, status=row.drp_status,
                         threshold_green="> 1.5×", threshold_amber="1.0–1.5×", unit="×"),
        stv=MetricStatus(value=stv, status=row.stv_status,
                         threshold_green="< 14 days", threshold_amber="14–18 days", unit="days"),
        elr=MetricStatus(value=elr, status=row.elr_status,
                         threshold_green="< 5%", threshold_amber="5–8%", unit="%"),
        wam_investor_months=wam_inv,
        wam_merchant_months=wam_mer,
        wam_safe=wam_inv > wam_mer,
        system_liquidity_reserve=float(row.system_liquidity_reserve),
        ofct=MetricStatus(value=ofct, status=row.ofct_status,
                          threshold_green="< 36h", threshold_amber="36–48h", unit="hours"),
        hpfr=MetricStatus(value=hpfr, status="green" if hpfr < 1.5 else "amber" if hpfr < 3 else "red",
                          threshold_green="< 1.5%", threshold_amber="1.5–3%", unit="%"),
        total_active_portfolio=float(row.total_active_portfolio),
        total_merchant_interest_collected=float(row.total_merchant_interest_collected),
        platform_net_margin=float(row.platform_net_margin),
        breakeven_volume_ngn=float(row.breakeven_volume_ngn),
        monthly_operating_cost=float(row.monthly_operating_cost),
        total_unclaimed_dividends=float(row.total_unclaimed_dividends),
        alerts=alerts,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/today", response_model=PlatformSnapshot)
def get_today_metrics(
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """Latest platform health snapshot. Falls back to yesterday if today isn't computed yet."""
    row = db.execute(
        select(DailySystemMetrics)
        .order_by(desc(DailySystemMetrics.snapshot_date))
        .limit(1)
    ).scalar_one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="No metrics snapshot available yet.")

    return _row_to_snapshot(row)


@router.get("/history", response_model=List[HistoryPoint])
def get_metrics_history(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """Historical daily snapshots for trend charts (default: last 30 days)."""
    since = date.today() - timedelta(days=days)
    rows = db.execute(
        select(DailySystemMetrics)
        .where(DailySystemMetrics.snapshot_date >= since)
        .order_by(DailySystemMetrics.snapshot_date)
    ).scalars().all()

    return [
        HistoryPoint(
            date=r.snapshot_date,
            npl_rate=float(r.npl_rate),
            drp_coverage_ratio=float(r.drp_coverage_ratio),
            early_liquidation_rate=float(r.early_liquidation_rate),
            stock_turnover_avg_days=float(r.stock_turnover_avg_days),
            total_active_portfolio=float(r.total_active_portfolio),
            platform_net_margin=float(r.platform_net_margin),
        )
        for r in rows
    ]


@router.get("/alerts", response_model=List[str])
def get_active_alerts(
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """All active threshold breach alerts from today's snapshot."""
    row = db.execute(
        select(DailySystemMetrics)
        .order_by(desc(DailySystemMetrics.snapshot_date))
        .limit(1)
    ).scalar_one_or_none()

    if row is None:
        return []

    return _row_to_snapshot(row).alerts


@router.post("/trigger-rollup", status_code=202)
def trigger_manual_rollup(
    target_date: Optional[date] = None,
    db: Session = Depends(deps.get_db),
    _user: str = Depends(deps.get_current_user_id),
):
    """
    Manually trigger the metrics rollup for a specific date (default: today).
    Useful during shadow-pilot month to cross-check against manual spreadsheets.
    """
    run_date = target_date or date.today()
    try:
        compute_daily_snapshot(run_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"queued": True, "date": str(run_date)}

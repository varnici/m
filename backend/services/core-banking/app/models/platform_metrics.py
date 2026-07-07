"""SQLAlchemy models for platform-wide financial metrics and OTP records."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Integer,
    Numeric, String, UniqueConstraint, text,
)

from app.infrastructure.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class DailySystemMetrics(Base):
    """Platform-wide daily snapshot. One row per calendar day."""
    __tablename__ = "daily_system_metrics"

    id = Column(String, primary_key=True, default=_uuid)
    snapshot_date = Column(Date, nullable=False, unique=True)

    # ── Risk & Credit Quality ──────────────────────────────────────
    total_active_portfolio    = Column(Numeric(15, 2), nullable=False, default=0)
    total_overdue_portfolio   = Column(Numeric(15, 2), nullable=False, default=0)
    npl_rate                  = Column(Numeric(5, 2),  nullable=False, default=0)   # %
    drp_cash_balance          = Column(Numeric(15, 2), nullable=False, default=0)
    drp_coverage_ratio        = Column(Numeric(5, 2),  nullable=False, default=0)   # x
    stock_turnover_avg_days   = Column(Numeric(5, 2),  nullable=False, default=0)   # days

    # ── Liquidity & ALM ───────────────────────────────────────────
    early_liquidation_rate        = Column(Numeric(5, 2),  nullable=False, default=0)  # %
    capital_liquidated_this_month = Column(Numeric(15, 2), nullable=False, default=0)
    wam_investor_months           = Column(Numeric(5, 2),  nullable=False, default=0)
    wam_merchant_months           = Column(Numeric(5, 2),  nullable=False, default=0)
    system_liquidity_reserve      = Column(Numeric(15, 2), nullable=False, default=0)
    total_unclaimed_dividends     = Column(Numeric(15, 2), nullable=False, default=0)

    # ── Operational ───────────────────────────────────────────────
    ofct_avg_hours       = Column(Numeric(6, 2),  nullable=False, default=0)   # hours
    hpfr_rate            = Column(Numeric(5, 2),  nullable=False, default=0)   # %
    total_pin_attempts   = Column(Integer,         nullable=False, default=0)
    failed_pin_attempts  = Column(Integer,         nullable=False, default=0)

    # ── Financial Spread ──────────────────────────────────────────
    total_investor_payouts              = Column(Numeric(15, 2), nullable=False, default=0)
    total_merchant_interest_collected   = Column(Numeric(15, 2), nullable=False, default=0)
    gateway_fees_passed_to_users        = Column(Numeric(15, 2), nullable=False, default=0)
    platform_net_margin                 = Column(Numeric(5, 2),  nullable=False, default=0)   # %
    monthly_operating_cost              = Column(Numeric(15, 2), nullable=False, default=0)
    breakeven_volume_ngn                = Column(Numeric(15, 2), nullable=False, default=0)

    # ── Traffic-light status flags ────────────────────────────────
    npl_status  = Column(String(10), nullable=False, default="green")  # green/amber/red
    drp_status  = Column(String(10), nullable=False, default="green")
    elr_status  = Column(String(10), nullable=False, default="green")
    ofct_status = Column(String(10), nullable=False, default="green")
    stv_status  = Column(String(10), nullable=False, default="green")

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))


class OtpRecord(Base):
    """One-time passwords — SMS or email — with rate-limit tracking."""
    __tablename__ = "otp_records"

    id         = Column(String, primary_key=True, default=_uuid)
    target     = Column(String(255), nullable=False)   # E.164 phone or email address
    channel    = Column(String(10),  nullable=False)   # 'sms' | 'email'
    code_hash  = Column(String(64),  nullable=False)   # SHA-256 of the 6-digit code
    purpose    = Column(String(50),  nullable=False, default="phone_verify")
    is_used    = Column(Boolean,     nullable=False, default=False)
    attempts   = Column(Integer,     nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))

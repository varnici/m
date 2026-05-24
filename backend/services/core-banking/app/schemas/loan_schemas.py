"""Loan and repayment schemas."""
from __future__ import annotations

from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class LoanCreate(BaseModel):
    """Schema for creating a loan."""
    user_id: str
    principal_kobo: int = Field(..., ge=0)
    service_fee_kobo: int = Field(default=0, ge=0)
    product_sku: str = Field(..., min_length=1)
    product_qty: int = Field(..., ge=1)


class RepaymentCreate(BaseModel):
    """Schema for recording a repayment."""
    loan_id: str
    amount_kobo: int = Field(..., ge=0)


class RepaymentOut(BaseModel):
    """Response schema for repayment."""
    id: str
    loan_id: str
    amount_kobo: int
    paid_at: datetime

    class Config:
        from_attributes = True


class LoanOut(BaseModel):
    """Response schema for loan."""
    id: str
    user_id: str
    status: str
    principal_kobo: int
    service_fee_kobo: int
    total_due_kobo: int
    repaid_kobo: int
    product_sku: str
    product_qty: int
    disbursed_at: Optional[datetime]
    next_repayment_date: Optional[date]
    outstanding_balance_kobo: int
    days_past_due: int
    last_payment_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

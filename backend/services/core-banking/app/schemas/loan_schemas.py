"""Loan application schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class LoanApplicationCreate(BaseModel):
    """Schema for applying for a loan."""
    amount_kobo: int = Field(..., ge=0)
    purpose: str = Field(..., min_length=1)
    term_months: int = Field(default=1, ge=1, le=12)


class RepaymentCreate(BaseModel):
    """Schema for recording a repayment. The loan is identified by the URL path."""
    amount_kobo: int = Field(..., ge=0)


class LoanTransactionOut(BaseModel):
    """Response schema for a loan transaction (disbursement or repayment)."""
    id: str
    loan_application_id: str
    type: str
    amount_kobo: int
    transaction_date: datetime
    description: str

    class Config:
        from_attributes = True


class LoanApplicationOut(BaseModel):
    """Response schema for a loan application."""
    id: str
    user_id: str
    amount_kobo: int
    purpose: str
    term_months: int
    interest_rate: float
    status: str
    applied_at: datetime
    approved_at: Optional[datetime]
    disbursed_at: Optional[datetime]
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True

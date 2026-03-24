from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LoanCreate(BaseModel):
    user_id: str
    product_sku: str
    product_qty: int = Field(..., ge=1)
    principal_kobo: int = Field(..., ge=0)


class LoanOut(BaseModel):
    id: str
    user_id: str
    status: str
    principal_kobo: int
    service_fee_kobo: int
    total_due_kobo: int
    repaid_kobo: int
    product_sku: str
    product_qty: int
    created_at: datetime

    class Config:
        from_attributes = True


class RepaymentCreate(BaseModel):
    amount_kobo: int = Field(..., ge=1)


class RepaymentOut(BaseModel):
    id: str
    loan_id: str
    amount_kobo: int
    paid_at: datetime

    class Config:
        from_attributes = True


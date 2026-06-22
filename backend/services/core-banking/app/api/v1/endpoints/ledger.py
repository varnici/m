"""
Double-Entry Ledger API — trial balance, account queries, chain verification.

Prefix: /v1/ledger
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.infrastructure.auth import get_current_user_id
from app.infrastructure.database import db_session
from app.services.ledger_service import LedgerService

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class TrialBalanceRow(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    total_debit_kobo: int
    total_credit_kobo: int
    balance_kobo: int


class TrialBalanceOut(BaseModel):
    rows: list[TrialBalanceRow]
    total_debits_kobo: int
    total_credits_kobo: int
    is_balanced: bool


class AccountBalanceOut(BaseModel):
    account_code: str
    balance_kobo: int


class LedgerEntryOut(BaseModel):
    id: str
    transaction_id: str
    debit_kobo: int
    credit_kobo: int
    memo: Optional[str]
    description: str
    reference_type: str
    reference_id: Optional[str]
    created_at: str


class ChainVerificationOut(BaseModel):
    valid: bool
    transactions_checked: int
    errors: list[dict]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/trial-balance", response_model=TrialBalanceOut)
def get_trial_balance(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        svc = LedgerService(db)
        rows = svc.get_trial_balance()
        total_d = sum(r["total_debit_kobo"] for r in rows)
        total_c = sum(r["total_credit_kobo"] for r in rows)
        return TrialBalanceOut(
            rows=[TrialBalanceRow(**r) for r in rows],
            total_debits_kobo=total_d,
            total_credits_kobo=total_c,
            is_balanced=total_d == total_c,
        )


@router.get("/account/{account_code}/balance", response_model=AccountBalanceOut)
def get_account_balance(
    account_code: str,
    user_id: str = Depends(get_current_user_id),
):
    with db_session() as db:
        svc = LedgerService(db)
        balance = svc.get_account_balance(account_code)
        return AccountBalanceOut(account_code=account_code, balance_kobo=balance)


@router.get("/account/{account_code}/entries", response_model=list[LedgerEntryOut])
def get_account_entries(
    account_code: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    with db_session() as db:
        svc = LedgerService(db)
        entries = svc.get_account_entries(account_code, limit=limit, offset=offset)
        return [LedgerEntryOut(**e) for e in entries]


@router.get("/verify-integrity", response_model=ChainVerificationOut)
def verify_chain_integrity(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        svc = LedgerService(db)
        result = svc.verify_chain_integrity()
        return ChainVerificationOut(**result)

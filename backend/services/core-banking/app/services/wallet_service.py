from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.services.ledger_service import LedgerService

logger = logging.getLogger(__name__)

# Every wallet-affecting transaction type also posts a balanced double-entry
# ledger transaction, using the chart of accounts seeded in
# 0008_double_entry_ledger.py / 0019_loan_ledger_accounts.py. LedgerService
# already existed with a full read API (trial balance, account history,
# hash-chain verification) but nothing ever called record_transaction, so the
# ledger tables were permanently empty — this is the write path.
#
# Ordinary wallet movements mirror the wallet's own credit/debit against the
# platform cash pool: 1000 Platform Cash Pool (asset), 2000 User Wallet
# Liabilities (asset the platform owes back to users on demand). Loan
# disbursement/repayment are different in kind — the platform isn't handing
# out or receiving its own cash, it's creating/collecting a receivable — so
# they post against 1300 Loans Receivable and 4200 Loan Interest Income
# instead (see loan_application_service._split_repayment for how a
# repayment's principal/interest split is computed).
_CASH_POOL = "1000"
_WALLET_LIABILITY = "2000"
_LOANS_RECEIVABLE = "1300"
_INTEREST_INCOME = "4200"

# (debit_account, credit_account) for the simple mirror types.
_SIMPLE_LEDGER_LEGS = {
    "topup": (_CASH_POOL, _WALLET_LIABILITY),
    "sale_proceeds": (_CASH_POOL, _WALLET_LIABILITY),
    "savings_withdrawal": (_CASH_POOL, _WALLET_LIABILITY),
    "transfer_out": (_WALLET_LIABILITY, _CASH_POOL),
}


def _post_ledger(
    db: Session,
    *,
    transaction: Transaction,
    type: str,
    amount_kobo: int,
    description: str | None,
    reference_id: str | None,
    principal_kobo: int | None,
    interest_kobo: int | None,
) -> None:
    if amount_kobo == 0:
        return

    if type == "loan_disbursement":
        entries = [
            {"account_code": _LOANS_RECEIVABLE, "debit_kobo": amount_kobo},
            {"account_code": _WALLET_LIABILITY, "credit_kobo": amount_kobo},
        ]
    elif type == "repayment_sweep":
        if principal_kobo is None or interest_kobo is None or principal_kobo + interest_kobo != amount_kobo:
            raise ValueError(
                "repayment_sweep requires principal_kobo and interest_kobo summing to amount_kobo"
            )
        entries = [{"account_code": _WALLET_LIABILITY, "debit_kobo": amount_kobo}]
        if principal_kobo:
            entries.append({"account_code": _LOANS_RECEIVABLE, "credit_kobo": principal_kobo})
        if interest_kobo:
            entries.append({"account_code": _INTEREST_INCOME, "credit_kobo": interest_kobo})
    elif type in _SIMPLE_LEDGER_LEGS:
        debit_account, credit_account = _SIMPLE_LEDGER_LEGS[type]
        entries = [
            {"account_code": debit_account, "debit_kobo": amount_kobo},
            {"account_code": credit_account, "credit_kobo": amount_kobo},
        ]
    else:
        raise ValueError(f"No ledger mapping for transaction type: {type}")

    LedgerService(db).record_transaction(
        reference_type=type,
        reference_id=reference_id,
        description=description or type,
        idempotency_key=transaction.id,
        created_by=None,
        entries=entries,
    )


def process_transaction(
    db: Session,
    *,
    user_id: str,
    type: str,
    amount_kobo: int,
    description: str | None = None,
    reference_id: str | None = None,
    principal_kobo: int | None = None,
    interest_kobo: int | None = None,
) -> Transaction:
    """
    Core banking engine ledger function.
    Ensures the wallet balance does not go negative (via DB check constraints
    and application checks), updates the wallet, records a corresponding
    Transaction log entry, and posts a balanced double-entry ledger
    transaction for the same movement.
    """
    if amount_kobo < 0:
        raise ValueError("Transaction amount must be non-negative.")

    # 1. Fetch wallet with pessimistic write lock to prevent race conditions (double-spend / race conditions)
    wallet = db.execute(
        select(Wallet).where(Wallet.user_id == user_id).with_for_update()
    ).scalar_one_or_none()

    if not wallet:
        raise ValueError(f"Wallet not found for user {user_id}")

    # 2. Determine new balance depending on transaction type
    if type in ("topup", "sale_proceeds", "loan_disbursement", "savings_withdrawal"):
        new_balance = wallet.balance_kobo + amount_kobo
    elif type in ("transfer_out", "repayment_sweep"):
        if wallet.balance_kobo < amount_kobo:
            raise ValueError(
                f"Insufficient funds for {type}. Available: {wallet.balance_kobo} kobo, requested: {amount_kobo} kobo"
            )
        new_balance = wallet.balance_kobo - amount_kobo
    else:
        raise ValueError(f"Unsupported transaction type: {type}")

    # 3. Update wallet state
    wallet.balance_kobo = new_balance
    wallet.updated_at = datetime.now(timezone.utc)

    # 4. Create and record the transaction log entry
    transaction = Transaction(
        wallet_id=wallet.id,
        type=type,
        amount_kobo=amount_kobo,
        running_balance_kobo=new_balance,
        description=description,
        reference_id=reference_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(transaction)
    db.flush()

    # 5. Mirror the same movement into the double-entry ledger. Uses the
    # wallet Transaction's own id as the idempotency key, so each wallet
    # movement posts exactly one ledger transaction.
    _post_ledger(
        db,
        transaction=transaction,
        type=type,
        amount_kobo=amount_kobo,
        description=description,
        reference_id=reference_id,
        principal_kobo=principal_kobo,
        interest_kobo=interest_kobo,
    )

    return transaction


def process_sale_proceeds(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    sale_id: str,
) -> Transaction:
    """
    Process sale proceeds by crediting the user's wallet.
    """
    description = f"Sale proceeds for sale reference {sale_id}"
    return process_transaction(
        db,
        user_id=user_id,
        type="sale_proceeds",
        amount_kobo=amount_kobo,
        description=description,
        reference_id=sale_id,
    )


def process_loan_disbursement(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    loan_application_id: str,
) -> Transaction:
    """
    Credits the borrower's wallet with a disbursed loan principal.
    """
    description = f"Loan disbursement for application {loan_application_id}"
    return process_transaction(
        db,
        user_id=user_id,
        type="loan_disbursement",
        amount_kobo=amount_kobo,
        description=description,
        reference_id=loan_application_id,
    )


def process_repayment_sweep(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    principal_kobo: int,
    interest_kobo: int,
    loan_id: str,
) -> Transaction:
    """
    Sweeps outstanding repayment amount from the user's wallet to service a
    loan. principal_kobo/interest_kobo (summing to amount_kobo) drive the
    ledger split between recovering the loan asset and recognizing interest
    revenue — see loan_application_service._split_repayment.
    """
    description = f"Loan repayment sweep for loan reference {loan_id}"
    return process_transaction(
        db,
        user_id=user_id,
        type="repayment_sweep",
        amount_kobo=amount_kobo,
        description=description,
        reference_id=loan_id,
        principal_kobo=principal_kobo,
        interest_kobo=interest_kobo,
    )


def process_transfer_out(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    destination_account: str | None = None,
) -> Transaction:
    """
    Process a debit/transfer out from the user's wallet.
    """
    description = f"Transfer out to {destination_account}" if destination_account else "Transfer out of wallet"
    return process_transaction(
        db,
        user_id=user_id,
        type="transfer_out",
        amount_kobo=amount_kobo,
        description=description,
    )

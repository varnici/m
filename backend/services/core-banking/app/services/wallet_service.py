from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.wallet import Wallet

logger = logging.getLogger(__name__)


def process_transaction(
    db: Session,
    *,
    user_id: str,
    type: str,
    amount_kobo: int,
    description: str | None = None,
    reference_id: str | None = None,
) -> Transaction:
    """
    Core banking engine ledger function.
    Applies double-entry style consistency checks, ensures the wallet balance
    does not go negative (via DB check constraints and application checks),
    updates the wallet, and records a corresponding Transaction log entry.
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
    if type in ("topup", "sale_proceeds"):
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


def process_repayment_sweep(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    loan_id: str,
) -> Transaction:
    """
    Sweeps outstanding repayment amount from the user's wallet to service a loan.
    """
    description = f"Loan repayment sweep for loan reference {loan_id}"
    return process_transaction(
        db,
        user_id=user_id,
        type="repayment_sweep",
        amount_kobo=amount_kobo,
        description=description,
        reference_id=loan_id,
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

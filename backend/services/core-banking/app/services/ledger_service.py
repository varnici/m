"""
Immutable Double-Entry Ledger Service with SHA-256 hash chaining.

Every transaction must balance: sum(debits) == sum(credits).
The hash chain prevents retroactive tampering.
"""
from __future__ import annotations

import hashlib
import uuid
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.ledger import ChartOfAccount, LedgerEntry, LedgerTransaction

GENESIS_HASH = "0" * 64


class LedgerIntegrityError(Exception):
    pass


class LedgerService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Core recording
    # ------------------------------------------------------------------

    def record_transaction(
        self,
        *,
        reference_type: str,
        reference_id: str | None,
        description: str,
        idempotency_key: str,
        created_by: str | None,
        entries: list[dict[str, Any]],
    ) -> LedgerTransaction:
        """
        Record a balanced double-entry transaction with hash chaining.

        Each entry dict: {account_code, debit_kobo, credit_kobo, memo?}
        Raises LedgerIntegrityError if debits != credits.
        Returns existing transaction if idempotency_key already exists.
        """
        existing = self.db.execute(
            select(LedgerTransaction).where(
                LedgerTransaction.idempotency_key == idempotency_key
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        if not entries:
            raise LedgerIntegrityError("Transaction must have at least one entry")

        total_debit = sum(e.get("debit_kobo", 0) for e in entries)
        total_credit = sum(e.get("credit_kobo", 0) for e in entries)
        if total_debit != total_credit:
            raise LedgerIntegrityError(
                f"Unbalanced transaction: debits={total_debit} != credits={total_credit}"
            )

        codes = {e["account_code"] for e in entries}
        valid_codes = set(
            self.db.execute(
                select(ChartOfAccount.code).where(ChartOfAccount.code.in_(codes))
            ).scalars().all()
        )
        missing = codes - valid_codes
        if missing:
            raise LedgerIntegrityError(f"Unknown account codes: {missing}")

        tx_id = str(uuid.uuid4())
        prev_hash = self._get_last_hash()
        entries_repr = self._entries_canonical(tx_id, entries)
        tx_hash = self._compute_hash(prev_hash, entries_repr)

        tx = LedgerTransaction(
            id=tx_id,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            idempotency_key=idempotency_key,
            created_by=created_by,
            prev_hash=prev_hash,
            tx_hash=tx_hash,
        )
        self.db.add(tx)

        for e in entries:
            entry = LedgerEntry(
                id=str(uuid.uuid4()),
                transaction_id=tx_id,
                account_code=e["account_code"],
                debit_kobo=e.get("debit_kobo", 0),
                credit_kobo=e.get("credit_kobo", 0),
                memo=e.get("memo"),
            )
            self.db.add(entry)

        self.db.flush()
        return tx

    # ------------------------------------------------------------------
    # Balance queries
    # ------------------------------------------------------------------

    def get_account_balance(self, account_code: str) -> int:
        row = self.db.execute(
            select(
                func.coalesce(func.sum(LedgerEntry.debit_kobo), 0).label("total_debit"),
                func.coalesce(func.sum(LedgerEntry.credit_kobo), 0).label("total_credit"),
            ).where(LedgerEntry.account_code == account_code)
        ).one()
        return int(row.total_debit) - int(row.total_credit)

    def get_trial_balance(self) -> list[dict]:
        rows = self.db.execute(
            select(
                LedgerEntry.account_code,
                ChartOfAccount.name,
                ChartOfAccount.account_type,
                func.coalesce(func.sum(LedgerEntry.debit_kobo), 0).label("total_debit"),
                func.coalesce(func.sum(LedgerEntry.credit_kobo), 0).label("total_credit"),
            )
            .join(ChartOfAccount, ChartOfAccount.code == LedgerEntry.account_code)
            .group_by(LedgerEntry.account_code, ChartOfAccount.name, ChartOfAccount.account_type)
            .order_by(LedgerEntry.account_code)
        ).all()

        result = []
        for r in rows:
            result.append({
                "account_code": r.account_code,
                "account_name": r.name,
                "account_type": r.account_type,
                "total_debit_kobo": int(r.total_debit),
                "total_credit_kobo": int(r.total_credit),
                "balance_kobo": int(r.total_debit) - int(r.total_credit),
            })
        return result

    def get_account_entries(
        self, account_code: str, limit: int = 50, offset: int = 0,
    ) -> list[dict]:
        rows = self.db.execute(
            select(
                LedgerEntry.id,
                LedgerEntry.transaction_id,
                LedgerEntry.debit_kobo,
                LedgerEntry.credit_kobo,
                LedgerEntry.memo,
                LedgerEntry.created_at,
                LedgerTransaction.description,
                LedgerTransaction.reference_type,
                LedgerTransaction.reference_id,
            )
            .join(LedgerTransaction, LedgerTransaction.id == LedgerEntry.transaction_id)
            .where(LedgerEntry.account_code == account_code)
            .order_by(LedgerEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()

        return [
            {
                "id": r.id,
                "transaction_id": r.transaction_id,
                "debit_kobo": int(r.debit_kobo),
                "credit_kobo": int(r.credit_kobo),
                "memo": r.memo,
                "description": r.description,
                "reference_type": r.reference_type,
                "reference_id": r.reference_id,
                "created_at": str(r.created_at),
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Chain integrity verification
    # ------------------------------------------------------------------

    def verify_chain_integrity(self) -> dict:
        txs = self.db.execute(
            select(LedgerTransaction)
            .order_by(LedgerTransaction.created_at.asc())
        ).scalars().all()

        if not txs:
            return {"valid": True, "transactions_checked": 0, "errors": []}

        errors = []
        expected_prev = GENESIS_HASH

        for tx in txs:
            if tx.prev_hash != expected_prev:
                errors.append({
                    "tx_id": tx.id,
                    "error": "prev_hash mismatch",
                    "expected": expected_prev,
                    "actual": tx.prev_hash,
                })

            entries = self.db.execute(
                select(LedgerEntry)
                .where(LedgerEntry.transaction_id == tx.id)
                .order_by(LedgerEntry.account_code, LedgerEntry.id)
            ).scalars().all()

            entries_data = [
                {
                    "account_code": e.account_code,
                    "debit_kobo": e.debit_kobo,
                    "credit_kobo": e.credit_kobo,
                }
                for e in entries
            ]
            entries_repr = self._entries_canonical(tx.id, entries_data)
            recomputed = self._compute_hash(tx.prev_hash, entries_repr)

            if tx.tx_hash != recomputed:
                errors.append({
                    "tx_id": tx.id,
                    "error": "tx_hash mismatch (possible tampering)",
                    "expected": recomputed,
                    "actual": tx.tx_hash,
                })

            expected_prev = tx.tx_hash

        return {
            "valid": len(errors) == 0,
            "transactions_checked": len(txs),
            "errors": errors,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_last_hash(self) -> str:
        row = self.db.execute(
            select(LedgerTransaction.tx_hash)
            .order_by(LedgerTransaction.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        return row if row else GENESIS_HASH

    @staticmethod
    def _entries_canonical(tx_id: str, entries: list[dict]) -> str:
        sorted_entries = sorted(
            entries,
            key=lambda e: (e["account_code"], e.get("debit_kobo", 0), e.get("credit_kobo", 0)),
        )
        parts = [tx_id]
        for e in sorted_entries:
            parts.append(f"{e['account_code']}:{e.get('debit_kobo', 0)}:{e.get('credit_kobo', 0)}")
        return "|".join(parts)

    @staticmethod
    def _compute_hash(prev_hash: str, entries_repr: str) -> str:
        payload = f"{prev_hash}|{entries_repr}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

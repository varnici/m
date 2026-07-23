"""add Loans Receivable and Loan Interest Income to the chart of accounts

The double-entry ledger (0008_double_entry_ledger.py) was fully built but
never had a write path anywhere in the app — LedgerService.record_transaction
was never called, so the ledger tables were permanently empty despite real
money moving through wallets and loans. This migration adds the two accounts
needed to post loan disbursement/repayment into the ledger; wallet_service.py
and loan_application_service.py now call LedgerService for every wallet
transaction type, not just loans.

Revision ID: 0019
Revises: 0018
Create Date: 2026-07-15
"""

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None

NEW_ACCOUNTS = [
    ("1300", "Loans Receivable", "asset", None, True, "Outstanding principal on disbursed business loans"),
    ("4200", "Loan Interest Income", "revenue", None, True, "Interest collected on repaid business loans"),
]


def _has_row(code: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM chart_of_accounts WHERE code = :code"), {"code": code}
    ).first()
    return result is not None


def upgrade():
    coa_table = sa.table(
        "chart_of_accounts",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("account_type", sa.String),
        sa.column("parent_code", sa.String),
        sa.column("is_system", sa.Boolean),
        sa.column("description", sa.Text),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    # created_at has no DB-level default in every environment — the ORM
    # model's default is Python-side (app/models/ledger.py), so environments
    # where this table was created via Base.metadata.create_all() (the dev
    # fallback, not this migration's own 0008 predecessor) have no
    # server-side default to fall back on for a raw bulk_insert.
    now = datetime.now(timezone.utc)
    rows = [
        {
            "code": code, "name": name, "account_type": atype, "parent_code": parent,
            "is_system": is_sys, "description": desc, "created_at": now,
        }
        for code, name, atype, parent, is_sys, desc in NEW_ACCOUNTS
        if not _has_row(code)
    ]
    if rows:
        op.bulk_insert(coa_table, rows)


def downgrade():
    for code, *_ in NEW_ACCOUNTS:
        op.execute(sa.text(f"DELETE FROM chart_of_accounts WHERE code = '{code}'"))

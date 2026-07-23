"""backfill the original 0008 chart-of-accounts seed rows if missing

Discovered while verifying 0019/0020 live: this dev database's
chart_of_accounts table exists (0008_double_entry_ledger ran and is recorded
as applied) but only ever had the 2 accounts 0019 just added — none of
0008's original 11 seed rows (1000 Platform Cash Pool, 2000 User Wallet
Liabilities, etc.) were actually present. Same bug class as every other
"Base.metadata.create_all() dev-fallback beat a migration to it" issue found
this session, just for seed data instead of table structure. Idempotent —
only inserts codes that don't already exist, so this is a no-op wherever
0008 already seeded correctly.

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-15
"""

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None

ORIGINAL_SEED = [
    ("1000", "Platform Cash Pool", "asset", None, True, "Master cash asset pool"),
    ("1100", "Escrow Holding", "asset", None, True, "Funds held in escrow during order fulfillment"),
    ("1200", "User Wallets Receivable", "asset", None, True, "Outstanding receivables from user wallets"),
    ("2000", "User Wallet Liabilities", "liability", None, True, "Deposits owed back to users"),
    ("2100", "Distributor Accounts Payable", "liability", None, True, "Wholesale payouts due to distributors"),
    ("2200", "Logistics Fees Payable", "liability", None, True, "Fulfillment fees due to logistics partners"),
    ("2300", "Investor Escrow Payable", "liability", None, True, "Escrow funds owed to 9-5 worker investors"),
    ("3000", "Default Reserve Pool", "equity", None, True, "Platform reserve equity buffer"),
    ("4000", "Platform Commission Revenue", "revenue", None, True, "Revenue from platform spread/commission"),
    ("4100", "Investment Management Fee", "revenue", None, True, "Fees from investment management"),
    ("5000", "Payment Processing Costs", "expense", None, True, "Third-party payment gateway fees"),
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
    now = datetime.now(timezone.utc)
    rows = [
        {
            "code": code, "name": name, "account_type": atype, "parent_code": parent,
            "is_system": is_sys, "description": desc, "created_at": now,
        }
        for code, name, atype, parent, is_sys, desc in ORIGINAL_SEED
        if not _has_row(code)
    ]
    if rows:
        op.bulk_insert(coa_table, rows)


def downgrade():
    # No-op: this migration only backfills rows that should have existed
    # since 0008. Downgrading shouldn't delete real ledger accounts that may
    # have entries posted against them by the time this is ever reversed.
    pass

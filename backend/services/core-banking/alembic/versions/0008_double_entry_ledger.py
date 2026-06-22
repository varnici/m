"""double-entry ledger system

Revision ID: 0008_double_entry_ledger
Revises: 0007_wallet_and_transactions_schema
Create Date: 2026-06-19 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_double_entry_ledger"
down_revision = "0007_wallet_and_transactions_schema"
branch_labels = None
depends_on = None


COA_SEED = [
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


def upgrade() -> None:
    op.create_table(
        "chart_of_accounts",
        sa.Column("code", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("account_type", sa.String(20), nullable=False),
        sa.Column("parent_code", sa.String(10), sa.ForeignKey("chart_of_accounts.code"), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')",
            name="ck_coa_account_type",
        ),
    )

    op.create_table(
        "ledger_transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("reference_type", sa.String(40), nullable=False),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.String(), nullable=False, unique=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("prev_hash", sa.String(64), nullable=False),
        sa.Column("tx_hash", sa.String(64), nullable=False),
        sa.Column("is_voided", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_lt_reference_id", "ledger_transactions", ["reference_id"])
    op.create_index("ix_lt_created_at", "ledger_transactions", ["created_at"])

    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("transaction_id", sa.String(), sa.ForeignKey("ledger_transactions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_code", sa.String(10), sa.ForeignKey("chart_of_accounts.code"), nullable=False),
        sa.Column("debit_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("credit_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("debit_kobo >= 0", name="ck_le_debit_non_negative"),
        sa.CheckConstraint("credit_kobo >= 0", name="ck_le_credit_non_negative"),
        sa.CheckConstraint(
            "(debit_kobo > 0 AND credit_kobo = 0) OR (debit_kobo = 0 AND credit_kobo > 0)",
            name="ck_le_single_sided",
        ),
    )
    op.create_index("ix_le_transaction_id", "ledger_entries", ["transaction_id"])
    op.create_index("ix_le_account_code", "ledger_entries", ["account_code"])

    # Seed Chart of Accounts
    coa_table = sa.table(
        "chart_of_accounts",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("account_type", sa.String),
        sa.column("parent_code", sa.String),
        sa.column("is_system", sa.Boolean),
        sa.column("description", sa.Text),
    )
    op.bulk_insert(coa_table, [
        {
            "code": code, "name": name, "account_type": atype,
            "parent_code": parent, "is_system": is_sys, "description": desc,
        }
        for code, name, atype, parent, is_sys, desc in COA_SEED
    ])


def downgrade() -> None:
    op.drop_table("ledger_entries")
    op.drop_table("ledger_transactions")
    op.drop_table("chart_of_accounts")

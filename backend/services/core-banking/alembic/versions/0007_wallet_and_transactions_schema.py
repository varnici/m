"""wallet and transactions schema

Revision ID: 0007_wallet_and_transactions_schema
Revises: 0006_stock_constraints_and_indexes
Create Date: 2026-05-21 13:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0007_wallet_and_transactions_schema"
down_revision = "0006_stock_constraints_and_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new columns to wallets
    op.add_column("wallets", sa.Column("credit_limit_kobo", sa.BigInteger(), nullable=True))
    op.add_column("wallets", sa.Column("available_credit_kobo", sa.BigInteger(), nullable=True))
    op.add_column("wallets", sa.Column("total_debt_kobo", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("wallets", sa.Column("next_repayment_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("wallets", sa.Column("repayment_amount_kobo", sa.BigInteger(), nullable=True))

    # 2. Add check constraints to wallets
    op.create_check_constraint(
        "ck_wallets_balance_non_negative",
        "wallets",
        "balance_kobo >= 0",
    )
    op.create_check_constraint(
        "ck_wallets_total_debt_non_negative",
        "wallets",
        "total_debt_kobo >= 0",
    )
    op.create_check_constraint(
        "ck_wallets_credit_limit_non_negative",
        "wallets",
        "credit_limit_kobo >= 0",
    )

    # 3. Create transactions table
    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("wallet_id", sa.String(), sa.ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
        sa.Column("running_balance_kobo", sa.BigInteger(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # 4. Add indexes
    op.create_index("ix_transactions_wallet_id", "transactions", ["wallet_id"])
    op.create_index("ix_transactions_reference_id", "transactions", ["reference_id"])

    # 5. Add check constraints to transactions
    op.create_check_constraint(
        "ck_transactions_amount_non_negative",
        "transactions",
        "amount_kobo >= 0",
    )
    op.create_check_constraint(
        "ck_transactions_running_balance_non_negative",
        "transactions",
        "running_balance_kobo >= 0",
    )


def downgrade() -> None:
    # 1. Drop transactions table and indexes
    op.drop_constraint("ck_transactions_running_balance_non_negative", "transactions", type_="check")
    op.drop_constraint("ck_transactions_amount_non_negative", "transactions", type_="check")
    op.drop_index("ix_transactions_reference_id", table_name="transactions")
    op.drop_index("ix_transactions_wallet_id", table_name="transactions")
    op.drop_table("transactions")

    # 2. Drop check constraints on wallets
    op.drop_constraint("ck_wallets_credit_limit_non_negative", "wallets", type_="check")
    op.drop_constraint("ck_wallets_total_debt_non_negative", "wallets", type_="check")
    op.drop_constraint("ck_wallets_balance_non_negative", "wallets", type_="check")

    # 3. Drop columns on wallets
    op.drop_column("wallets", "repayment_amount_kobo")
    op.drop_column("wallets", "next_repayment_date")
    op.drop_column("wallets", "total_debt_kobo")
    op.drop_column("wallets", "available_credit_kobo")
    op.drop_column("wallets", "credit_limit_kobo")

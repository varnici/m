"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("phone", sa.String(), nullable=False, unique=True),
        sa.Column("email", sa.String(), nullable=True, unique=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=False, server_default="personal"),
        sa.Column("trust_level", sa.String(), nullable=False, server_default="bronze"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "wallets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("balance_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "sales",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("product_sku", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_kobo", sa.BigInteger(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False, server_default="manual"),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "loans",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("principal_kobo", sa.BigInteger(), nullable=False),
        sa.Column("service_fee_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total_due_kobo", sa.BigInteger(), nullable=False),
        sa.Column("repaid_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("product_sku", sa.String(), nullable=False),
        sa.Column("product_qty", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "repayments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("loan_id", sa.String(), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("repayments")
    op.drop_table("loans")
    op.drop_table("sales")
    op.drop_table("wallets")
    op.drop_table("users")


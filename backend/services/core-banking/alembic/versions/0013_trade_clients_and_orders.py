"""trade clients and trade orders

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trade_clients",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
        sa.Column("vat_number", sa.String(), nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("contact_phone", sa.String(), nullable=True),
        sa.Column("contact_email", sa.String(), nullable=True),
        sa.Column("default_payment_terms", sa.String(), nullable=False, server_default="immediate"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_trade_clients_owner_id", "trade_clients", ["owner_id"])

    op.create_table(
        "trade_orders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(), sa.ForeignKey("trade_clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("store_id", sa.String(), sa.ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("payment_terms", sa.String(), nullable=False, server_default="immediate"),
        sa.Column("total_kobo", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("sale_id", sa.String(), sa.ForeignKey("sales_transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("total_kobo >= 0", name="ck_trade_orders_total_non_negative"),
    )
    op.create_index("ix_trade_orders_owner_id", "trade_orders", ["owner_id"])
    op.create_index("ix_trade_orders_client_id", "trade_orders", ["client_id"])

    op.create_table(
        "trade_order_lines",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("trade_order_id", sa.String(), sa.ForeignKey("trade_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.String(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_kobo", sa.BigInteger(), nullable=False),
        sa.Column("reservation_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("quantity > 0", name="ck_trade_order_lines_quantity_positive"),
        sa.CheckConstraint("unit_price_kobo >= 0", name="ck_trade_order_lines_unit_price_non_negative"),
    )
    op.create_index("ix_trade_order_lines_trade_order_id", "trade_order_lines", ["trade_order_id"])


def downgrade():
    op.drop_table("trade_order_lines")
    op.drop_table("trade_orders")
    op.drop_table("trade_clients")

"""add products.is_wholesale_listed and trade_orders.buyer_owner_id

Foundation for cross-tenant distributor ordering (a business owner placing
an order against a distributor's own catalog, distinct from TradeOrder's
existing same-tenant "invoice my own customer from my own stock" use).

products.is_wholesale_listed: a distributor explicitly marks which products
are visible to business-owner buyers browsing their catalog (default false —
opt-in, not every warehouse SKU should be orderable by external buyers).

trade_orders.buyer_owner_id: nullable FK to users.id. When set, owner_id is
the distributor (whose stock/catalog the order draws from) and
buyer_owner_id is the business owner who placed it — existing same-tenant
orders leave this null and are unaffected.

trade_clients.linked_user_id: nullable FK to users.id, set when a CRM
contact represents another platform user (the buyer) rather than a manually
typed-in customer — lets order creation find-or-create it reliably.

Revision ID: 0024
Revises: 0023
Create Date: 2026-08-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns(table_name)}
    if column.name not in columns:
        op.add_column(table_name, column)


def upgrade():
    _add_column_if_missing(
        "products",
        sa.Column("is_wholesale_listed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    _add_column_if_missing(
        "trade_orders",
        sa.Column("buyer_owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    _add_column_if_missing(
        "trade_clients",
        sa.Column("linked_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade():
    op.drop_column("trade_clients", "linked_user_id")
    op.drop_column("trade_orders", "buyer_owner_id")
    op.drop_column("products", "is_wholesale_listed")

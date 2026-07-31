"""add stores.business_type, categories.icon/tint, products.size/imei/expiry_date

Closes gaps found while wiring the inventory UI to business-type templates
(provision/pharmacy/boutique/phones/building/custom): stores need a
business_type to drive which optional product fields matter, categories need
a picker-friendly icon+tint pair (today's image_url is a free-text URL, not a
symbolic icon key), and products need size (apparel) / imei (phones) /
expiry_date (an absolute date, distinct from the existing relative
is_perishable + shelf_life_days pair) to support the reorder & expiry alerts
screen.

Revision ID: 0022
Revises: 0021
Create Date: 2026-07-30
"""

from alembic import op
import sqlalchemy as sa

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns(table_name)}
    if column.name not in columns:
        op.add_column(table_name, column)


def upgrade():
    _add_column_if_missing(
        "stores",
        sa.Column("business_type", sa.String(), nullable=True, server_default="custom"),
    )
    _add_column_if_missing(
        "categories",
        sa.Column("icon", sa.String(), nullable=True, server_default="Package"),
    )
    _add_column_if_missing(
        "categories",
        sa.Column("tint", sa.String(length=7), nullable=True, server_default="#2E6E9E"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("size", sa.String(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("imei", sa.String(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("expiry_date", sa.Date(), nullable=True),
    )


def downgrade():
    op.drop_column("products", "expiry_date")
    op.drop_column("products", "imei")
    op.drop_column("products", "size")
    op.drop_column("categories", "tint")
    op.drop_column("categories", "icon")
    op.drop_column("stores", "business_type")

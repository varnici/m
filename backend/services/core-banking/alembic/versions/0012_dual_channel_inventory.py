"""dual-channel inventory fields

Revision ID: 0012
Revises: 0011
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
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
        sa.Column("trade_price_kobo", sa.BigInteger(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("expected_amount", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("actual_amount", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("discrepancy_qty", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("monthly_velocity", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("days_of_supply", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("trade_moq", sa.Integer(), nullable=False, server_default="1"),
    )

    op.execute(
        "UPDATE products SET trade_price_kobo = selling_price_kobo "
        "WHERE trade_price_kobo = 0"
    )


def downgrade():
    for column_name in (
        "trade_moq",
        "days_of_supply",
        "monthly_velocity",
        "discrepancy_qty",
        "actual_amount",
        "expected_amount",
        "trade_price_kobo",
    ):
        op.drop_column("products", column_name)

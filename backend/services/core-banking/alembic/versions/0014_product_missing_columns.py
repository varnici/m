"""add product columns declared on the ORM model but never migrated

The Product SQLAlchemy model (app/models/inventory.py) declares
expenses_kobo, quantity_sold, quantity_on_credit, unit_price_kobo, estate,
city, latitude, longitude — none of these ever got a migration, so every
ORM query against `products` (a plain `SELECT *`-shaped query) has been
failing with `UndefinedColumn` in any environment that ran migrations from
a clean base. Pre-existing gap, unrelated to the dual-channel columns added
in 0012/0013.

Revision ID: 0014
Revises: 0013
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
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
        sa.Column("expenses_kobo", sa.BigInteger(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("quantity_sold", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("quantity_on_credit", sa.Integer(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        "products",
        sa.Column("unit_price_kobo", sa.BigInteger(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("estate", sa.String(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("city", sa.String(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("latitude", sa.Float(), nullable=True),
    )
    _add_column_if_missing(
        "products",
        sa.Column("longitude", sa.Float(), nullable=True),
    )


def downgrade():
    for column_name in (
        "longitude",
        "latitude",
        "city",
        "estate",
        "unit_price_kobo",
        "quantity_on_credit",
        "quantity_sold",
        "expenses_kobo",
    ):
        op.drop_column("products", column_name)

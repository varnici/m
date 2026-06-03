"""add stock constraints and composite indexes

Revision ID: 0006_stock_constraints_and_indexes
Revises: 0005_schema_updates
Create Date: 2026-04-27 18:10:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "0006_stock_constraints_and_indexes"
down_revision = "0005_schema_updates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Normalize old invalid rows before adding constraints.
    op.execute("UPDATE stock_levels SET quantity_on_hand = 0 WHERE quantity_on_hand < 0")
    op.execute("UPDATE stock_levels SET quantity_reserved = 0 WHERE quantity_reserved < 0")

    op.create_check_constraint(
        "ck_stock_levels_quantity_on_hand_non_negative",
        "stock_levels",
        "quantity_on_hand >= 0",
    )
    op.create_check_constraint(
        "ck_stock_levels_quantity_reserved_non_negative",
        "stock_levels",
        "quantity_reserved >= 0",
    )

    op.create_index(
        "ix_stock_levels_product_store",
        "stock_levels",
        ["product_id", "store_id"],
        unique=False,
    )
    op.create_index(
        "ix_products_owner_active",
        "products",
        ["owner_id", "is_active"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_products_owner_active", table_name="products")
    op.drop_index("ix_stock_levels_product_store", table_name="stock_levels")
    op.drop_constraint(
        "ck_stock_levels_quantity_reserved_non_negative",
        "stock_levels",
        type_="check",
    )
    op.drop_constraint(
        "ck_stock_levels_quantity_on_hand_non_negative",
        "stock_levels",
        type_="check",
    )

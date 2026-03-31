"""add marketplace and artisan tables

Revision ID: 0002_marketplace_artisans
Revises: 0001_init
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_marketplace_artisans"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("unit_price_kobo", sa.Integer(), nullable=False),
        sa.Column("estate", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "listings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("product_id", sa.String(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("price_kobo", sa.Integer(), nullable=False),
        sa.Column("available_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("slug", sa.String(), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "artisans",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("trade_category", sa.String(), nullable=False),
        sa.Column("years_experience", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("service_area", sa.String(), nullable=True),
        sa.Column("estate", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="provisional"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "artisan_bookings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("artisan_id", sa.String(), sa.ForeignKey("artisans.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("client_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("service_category", sa.String(), nullable=False),
        sa.Column("problem_description", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "artisan_ratings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("booking_id", sa.String(), sa.ForeignKey("artisan_bookings.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("goods_condition_ok", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("on_time", sa.String(), nullable=False, server_default="yes"),
        sa.Column("communication_ok", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("correct_address", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("artisan_ratings")
    op.drop_table("artisan_bookings")
    op.drop_table("artisans")
    op.drop_table("listings")
    op.drop_table("products")


"""add transport driver profile and booking tables

Revision ID: 0003_transport_profiles_bookings
Revises: 0002_marketplace_artisans
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_transport_profiles_bookings"
down_revision = "0002_marketplace_artisans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "driver_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("vehicle_type", sa.String(), nullable=False),
        sa.Column("vehicle_plate", sa.String(), nullable=False),
        sa.Column("certifications_json", sa.String(), nullable=False, server_default="[]"),
        sa.Column("nin_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("vehicle_docs_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_online", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("current_lat", sa.Float(), nullable=True),
        sa.Column("current_lng", sa.Float(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_jobs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "transport_bookings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("client_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("driver_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("vehicle_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("pickup_address", sa.String(), nullable=False),
        sa.Column("pickup_lat", sa.Float(), nullable=False),
        sa.Column("pickup_lng", sa.Float(), nullable=False),
        sa.Column("delivery_address", sa.String(), nullable=False),
        sa.Column("delivery_lat", sa.Float(), nullable=False),
        sa.Column("delivery_lng", sa.Float(), nullable=False),
        sa.Column("item_description", sa.String(), nullable=False),
        sa.Column("item_weight_kg", sa.Float(), nullable=False),
        sa.Column("declared_goods_value_kobo", sa.Integer(), nullable=False),
        sa.Column("delivery_fee_kobo", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_transport_bookings_client_user_id", "transport_bookings", ["client_user_id"])
    op.create_index("ix_transport_bookings_driver_user_id", "transport_bookings", ["driver_user_id"])

    op.create_table(
        "booking_tracking_points",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("booking_id", sa.String(), sa.ForeignKey("transport_bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("driver_user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_booking_tracking_points_booking_id", "booking_tracking_points", ["booking_id"])


def downgrade() -> None:
    op.drop_index("ix_booking_tracking_points_booking_id", table_name="booking_tracking_points")
    op.drop_table("booking_tracking_points")
    op.drop_index("ix_transport_bookings_driver_user_id", table_name="transport_bookings")
    op.drop_index("ix_transport_bookings_client_user_id", table_name="transport_bookings")
    op.drop_table("transport_bookings")
    op.drop_table("driver_profiles")


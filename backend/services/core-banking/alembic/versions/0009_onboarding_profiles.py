"""onboarding profiles for multi-party KYC

Revision ID: 0009_onboarding_profiles
Revises: 0008_double_entry_ledger
Create Date: 2026-06-19 14:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_onboarding_profiles"
down_revision = "0008_double_entry_ledger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Onboarding step tracker
    op.create_table(
        "onboarding_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("account_type", sa.String(30), nullable=False),
        sa.Column("current_step", sa.String(40), nullable=False, server_default="basic_info"),
        sa.Column("steps_completed", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_complete", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Merchant / SME profile
    op.create_table(
        "merchant_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("business_name", sa.String(200), nullable=True),
        sa.Column("market_association_id", sa.String(100), nullable=True),
        sa.Column("cac_number", sa.String(30), nullable=True),
        sa.Column("gps_lat", sa.Float(), nullable=True),
        sa.Column("gps_lng", sa.Float(), nullable=True),
        sa.Column("pos_terminal_id", sa.String(60), nullable=True),
        sa.Column("store_front_photo_url", sa.Text(), nullable=True),
        sa.Column("face_id_photo_url", sa.Text(), nullable=True),
        sa.Column("inventory_category", sa.String(60), nullable=True),
        sa.Column("daily_turnover_estimate_kobo", sa.Integer(), nullable=True),
        sa.Column("gps_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pos_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Distributor / Wholesale profile
    op.create_table(
        "distributor_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("cac_reg_number", sa.String(30), nullable=True),
        sa.Column("tin", sa.String(20), nullable=True),
        sa.Column("cac_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("warehouse_address", sa.Text(), nullable=True),
        sa.Column("warehouse_lat", sa.Float(), nullable=True),
        sa.Column("warehouse_lng", sa.Float(), nullable=True),
        sa.Column("product_categories", sa.Text(), nullable=True),
        sa.Column("min_order_value_kobo", sa.Integer(), nullable=True),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("account_number", sa.String(20), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4. Logistics partner profile
    op.create_table(
        "logistics_partner_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("fleet_size", sa.Integer(), nullable=True),
        sa.Column("vehicle_registration_numbers", sa.Text(), nullable=True),
        sa.Column("driver_license_number", sa.String(30), nullable=True),
        sa.Column("insurance_provider", sa.String(100), nullable=True),
        sa.Column("insurance_policy_number", sa.String(60), nullable=True),
        sa.Column("insurance_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("vehicle_docs_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("operating_regions", sa.Text(), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("logistics_partner_profiles")
    op.drop_table("distributor_profiles")
    op.drop_table("merchant_profiles")
    op.drop_table("onboarding_profiles")

"""add products.parent_id/conversion_factor and merchant_profiles KYC result columns

products.parent_id/conversion_factor: already present on the SQLAlchemy
Product model (app/models/inventory.py) and already read by
StockService._handle_depletion/_handle_replenishment for pack/bag/carton ->
base-unit stock conversion, but no Alembic migration ever applied them to
the actual database — every product read would 500 with "column does not
exist" the moment ProductOut started serializing them. Using
ADD COLUMN IF NOT EXISTS defensively in case an earlier ad-hoc script
already added them outside Alembic (this project has a history of that —
see migrations/023_ensure_businesses_business_name.sql on the Supabase side).

merchant_profiles.kyc_*: result of the Biometric KYC call added in
app/services/kyc_service.py, wired into the "bvn_verify" onboarding step.

Revision ID: 0025
Revises: 0024
Create Date: 2026-08-10
"""

from alembic import op


revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id VARCHAR "
        "REFERENCES products(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_factor INTEGER NOT NULL DEFAULT 1"
    )
    op.execute(
        "ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS kyc_confidence DOUBLE PRECISION"
    )
    op.execute(
        "ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS kyc_result_message TEXT"
    )
    op.execute(
        "ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE merchant_profiles DROP COLUMN IF EXISTS kyc_verified_at")
    op.execute("ALTER TABLE merchant_profiles DROP COLUMN IF EXISTS kyc_result_message")
    op.execute("ALTER TABLE merchant_profiles DROP COLUMN IF EXISTS kyc_confidence")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS conversion_factor")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS parent_id")

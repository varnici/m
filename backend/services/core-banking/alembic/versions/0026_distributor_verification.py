"""add distributor_profiles.verification_note/verified_at

DistributorProfile.verified had no code path that ever set it True — no
admin/ops action existed to approve a distributor, so no distributor could
ever appear in the buyer directory (GET /distributors defaults
verified_only=true) or receive a cross-tenant order (POST
/distributors/{id}/orders requires verified=True). This migration adds the
columns the new POST /v1/distributors/{id}/verify admin endpoint writes to;
verified itself already exists on the table.

Revision ID: 0026
Revises: 0025
Create Date: 2026-08-10
"""

from alembic import op


revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS verification_note TEXT"
    )
    op.execute(
        "ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS verified_at")
    op.execute("ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS verification_note")

"""drop phone_otps — orphaned OTP system, zero frontend callers

Three overlapping OTP systems existed: this one (auth_phone.py, bcrypt,
Supabase-session-coupled, SMS forced to mock via SMS_PROVIDER=mock, zero
frontend callers), otp_service.py (SHA-256, real Termii/SMTP wiring, already
the primary caller from onboarding screens — kept as canonical), and a
Supabase-client-only email/phone OTP lib (fully disconnected from the
backend, migrated onto otp_service.py in this same change).

Revision ID: 0016
Revises: 0015
Create Date: 2026-07-13
"""

from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def upgrade():
    if _has_table("phone_otps"):
        op.drop_table("phone_otps")


def downgrade():
    if not _has_table("phone_otps"):
        op.create_table(
            "phone_otps",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("phone", sa.String(length=20), nullable=False),
            sa.Column("otp_hash", sa.Text(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_phone_otps_phone", "phone_otps", ["phone"])

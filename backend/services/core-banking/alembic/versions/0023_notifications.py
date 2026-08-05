"""add notifications and device_tokens tables

Revives the Notification model deleted in commit 2ac5fca ("just") as part of
a large consolidation cleanup — the model itself was sound, just orphaned
with no callers at the time. Needed now as the real backing for
NotificationsScreen.tsx (currently hardcoded fake data) and for distributor
order-request / fund-transfer alerts. Extended from the original with
related_entity_type/related_entity_id for deep-linking and a JSON metadata
column for structured payloads (e.g. order line items).

device_tokens is push-token registration scaffolding for expo-notifications
(installed but unused) — in-app notifications work without it; it's here so
remote push delivery is a credentials-only step later, not a schema change.

Revision ID: 0023
Revises: 0022
Create Date: 2026-08-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def upgrade():
    if not _has_table("notifications"):
        op.create_table(
            "notifications",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("message", sa.String(), nullable=False),
            sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("related_entity_type", sa.String(), nullable=True),
            sa.Column("related_entity_id", sa.String(), nullable=True),
            sa.Column("notification_metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read"])

    if not _has_table("device_tokens"):
        op.create_table(
            "device_tokens",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("push_token", sa.String(), nullable=False, unique=True),
            sa.Column("platform", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])


def downgrade():
    if _has_table("device_tokens"):
        op.drop_index("ix_device_tokens_user_id", table_name="device_tokens")
        op.drop_table("device_tokens")

    if _has_table("notifications"):
        op.drop_index("ix_notifications_user_read", table_name="notifications")
        op.drop_index("ix_notifications_user_id", table_name="notifications")
        op.drop_table("notifications")

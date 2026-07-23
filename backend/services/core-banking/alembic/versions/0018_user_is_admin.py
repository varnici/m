"""add is_admin flag to users

No admin/role concept existed on the User model before this — the
admin_metrics endpoints were only gated by "any authenticated user",
not an actual admin check. Idempotent, matching the rest of this
migration series (create_all()'s dev-convenience fallback may have
already materialized this if the model change landed before the
migration ran).

Revision ID: 0018
Revises: 0017
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns(table_name)}
    return column_name in columns


def upgrade():
    if not _has_column("users", "is_admin"):
        op.add_column(
            "users",
            sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade():
    if _has_column("users", "is_admin"):
        op.drop_column("users", "is_admin")

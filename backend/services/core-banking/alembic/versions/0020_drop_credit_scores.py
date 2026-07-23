"""drop credit_scores table (dead code removal)

The daily_credit_recalc.py job that populated this table was never scheduled
anywhere (only eagerly imported for import-safety) and, separately, had a
live crash bug (iterating an already-unwrapped list of user id strings and
then re-accessing .id on each string). The table was permanently empty for
every user, but the main dashboard still queried it and always rendered
"0/1000, Bronze" — a broken, misleading UI element on every business owner's
home screen. Deleted the model, the task, the two dedicated /credit-score(s)
endpoints, and the dashboard tile in favor of the real, working loan
eligibility numbers (see loan_application_service.check_eligibility).

Revision ID: 0020
Revises: 0019
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def upgrade():
    if _has_table("credit_scores"):
        op.drop_table("credit_scores")


def downgrade():
    if not _has_table("credit_scores"):
        op.create_table(
            "credit_scores",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False),
            sa.Column("risk_level", sa.String(), nullable=False),
            sa.Column("factors", sa.JSON(), nullable=False),
            sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )

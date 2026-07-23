"""user columns and savings tables declared on models but never migrated

`users.business_name/profile_image_url/settings/hashed_pin` and the entire
`savings_goals`/`savings_transactions`/`savings_streaks` table set exist as
SQLAlchemy models but were never covered by any prior migration — the same
migration-vs-model drift bug found (and fixed) for `products` and `loans`.
All steps are existence-checked since `Base.metadata.create_all()`'s
dev-convenience fallback can already have materialized these.

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def _has_column(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns(table_name)}
    return column_name in columns


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if not _has_column(table_name, column.name):
        op.add_column(table_name, column)


def upgrade():
    _add_column_if_missing("users", sa.Column("business_name", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("profile_image_url", sa.String(), nullable=True))
    _add_column_if_missing("users", sa.Column("settings", sa.JSON(), nullable=True, server_default="{}"))
    _add_column_if_missing("users", sa.Column("hashed_pin", sa.String(), nullable=True))

    if not _has_table("savings_goals"):
        op.create_table(
            "savings_goals",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(), nullable=False, server_default="General"),
            sa.Column("target_amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("current_total_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("currency", sa.String(), nullable=False, server_default="NGN"),
            sa.Column("status", sa.String(), nullable=False, server_default="active"),
            sa.Column("is_auto_save_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("auto_save_amount_kobo", sa.BigInteger(), nullable=True, server_default="0"),
            sa.Column("auto_save_frequency", sa.String(), nullable=True),
            sa.Column("target_date", sa.Date(), nullable=True),
            sa.Column("image_url", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("target_amount_kobo > 0", name="ck_savings_goals_target_amount_positive"),
            sa.CheckConstraint("current_total_kobo >= 0", name="ck_savings_goals_current_total_non_negative"),
        )
        op.create_index("ix_savings_goals_user_id", "savings_goals", ["user_id"])

    if not _has_table("savings_transactions"):
        op.create_table(
            "savings_transactions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("goal_id", sa.String(), sa.ForeignKey("savings_goals.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("transaction_type", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("management_fee_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("partner_commission_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("reference", sa.String(), nullable=True, unique=True),
            sa.Column("source", sa.String(), nullable=True, server_default="manual"),
            sa.Column("transaction_metadata", sa.JSON(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("amount_kobo <> 0", name="ck_savings_transactions_amount_non_zero"),
        )
        op.create_index("ix_savings_transactions_goal_id", "savings_transactions", ["goal_id"])
        op.create_index("ix_savings_transactions_user_id", "savings_transactions", ["user_id"])

    if not _has_table("savings_streaks"):
        op.create_table(
            "savings_streaks",
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("last_deposit_date", sa.Date(), nullable=True),
            sa.Column("streak_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_savings_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_streak_update", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade():
    if _has_table("savings_streaks"):
        op.drop_table("savings_streaks")
    if _has_table("savings_transactions"):
        op.drop_table("savings_transactions")
    if _has_table("savings_goals"):
        op.drop_table("savings_goals")

    for column_name in ("hashed_pin", "settings", "profile_image_url", "business_name"):
        if _has_column("users", column_name):
            op.drop_column("users", column_name)

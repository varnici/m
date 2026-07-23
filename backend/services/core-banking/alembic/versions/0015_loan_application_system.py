"""loan application system — replaces the loans/repayments tables

The live Loan/Repayment system had no approval gate and never credited the
wallet on "disbursement" while still sweeping real repayments out. This
migration creates the more complete loan_applications / loan_repayment_schedules
/ loan_transactions / loan_metrics tables (already modeled in the ORM but never
migrated) and drops the old loans/repayments tables. Only LoanDashboardScreen
and ContractViewerScreen touch this data on the frontend, and both are
re-pointed at the new tables in the same change.

All CREATE steps are existence-checked: app/main.py's `Base.metadata.create_all()`
dev-convenience fallback can silently materialize a table shaped exactly like
the ORM model before its migration ever runs (confirmed in this repo's own dev
DB, which is exactly the class of bug this whole migration exists to prevent
happening again).

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-13
"""

from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(name)


def _has_index(table_name: str, index_name: str) -> bool:
    conn = op.get_bind()
    existing = {ix["name"] for ix in sa.inspect(conn).get_indexes(table_name)}
    return index_name in existing


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    if not _has_index(table_name, index_name):
        op.create_index(index_name, table_name, columns)


def upgrade():
    if not _has_table("loan_applications"):
        op.create_table(
            "loan_applications",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("purpose", sa.String(), nullable=False),
            sa.Column("term_months", sa.Integer(), nullable=False),
            sa.Column("interest_rate", sa.Float(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("disbursed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("rejection_reason", sa.String(), nullable=True),
        )
    _create_index_if_missing("ix_loan_applications_user_id", "loan_applications", ["user_id"])
    _create_index_if_missing("ix_loan_applications_status", "loan_applications", ["status"])

    if not _has_table("loan_repayment_schedules"):
        op.create_table(
            "loan_repayment_schedules",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("loan_application_id", sa.String(), sa.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False),
            sa.Column("installment_number", sa.Integer(), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("principal_kobo", sa.BigInteger(), nullable=False),
            sa.Column("interest_kobo", sa.BigInteger(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        )
    _create_index_if_missing(
        "ix_loan_repayment_schedules_application_id", "loan_repayment_schedules", ["loan_application_id"]
    )

    if not _has_table("loan_transactions"):
        op.create_table(
            "loan_transactions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("loan_application_id", sa.String(), sa.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("transaction_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("description", sa.String(), nullable=False),
        )
    _create_index_if_missing("ix_loan_transactions_application_id", "loan_transactions", ["loan_application_id"])

    if not _has_table("loan_metrics"):
        op.create_table(
            "loan_metrics",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("active_loans_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_loan_amount_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("total_outstanding_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("repayment_rate", sa.Float(), nullable=False, server_default="0"),
            sa.Column("default_rate", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    _create_index_if_missing("ix_loan_metrics_user_date", "loan_metrics", ["user_id", "date"])

    if _has_table("repayments"):
        op.drop_table("repayments")
    if _has_table("loans"):
        op.drop_table("loans")


def downgrade():
    if not _has_table("loans"):
        op.create_table(
            "loans",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("principal_kobo", sa.BigInteger(), nullable=False),
            sa.Column("service_fee_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("total_due_kobo", sa.BigInteger(), nullable=False),
            sa.Column("repaid_kobo", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("product_sku", sa.String(), nullable=False),
            sa.Column("product_qty", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    if not _has_table("repayments"):
        op.create_table(
            "repayments",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("loan_id", sa.String(), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    if _has_table("loan_metrics"):
        op.drop_table("loan_metrics")
    if _has_table("loan_transactions"):
        op.drop_table("loan_transactions")
    if _has_table("loan_repayment_schedules"):
        op.drop_table("loan_repayment_schedules")
    if _has_table("loan_applications"):
        op.drop_table("loan_applications")

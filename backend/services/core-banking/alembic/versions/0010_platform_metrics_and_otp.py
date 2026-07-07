"""Platform metrics daily snapshot and OTP records table

Revision ID: 0010
Revises: 0009_onboarding_profiles
Create Date: 2026-07-03
"""

from alembic import op
import sqlalchemy as sa

revision = '0010'
down_revision = '0009_onboarding_profiles'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    existing_tables = sa.inspect(conn).get_table_names()

    # ── Daily system-wide analytics snapshot ─────────────────────
    if 'daily_system_metrics' not in existing_tables:
        op.create_table(
            'daily_system_metrics',
            sa.Column('id', sa.String(), nullable=False,
                      server_default=sa.text("gen_random_uuid()::text")),
            sa.Column('snapshot_date', sa.Date(), nullable=False),
            sa.Column('total_active_portfolio',    sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('total_overdue_portfolio',   sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('npl_rate',                  sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('drp_cash_balance',          sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('drp_coverage_ratio',        sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('stock_turnover_avg_days',   sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('early_liquidation_rate',        sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('capital_liquidated_this_month', sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('wam_investor_months',           sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('wam_merchant_months',           sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('system_liquidity_reserve',      sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('total_unclaimed_dividends',     sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('ofct_avg_hours',      sa.Numeric(6, 2), nullable=False, server_default='0'),
            sa.Column('hpfr_rate',           sa.Numeric(5, 2), nullable=False, server_default='0'),
            sa.Column('total_pin_attempts',  sa.Integer(),     nullable=False, server_default='0'),
            sa.Column('failed_pin_attempts', sa.Integer(),     nullable=False, server_default='0'),
            sa.Column('total_investor_payouts',            sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('total_merchant_interest_collected', sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('gateway_fees_passed_to_users',      sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('platform_net_margin',               sa.Numeric(5,  2), nullable=False, server_default='0'),
            sa.Column('monthly_operating_cost',            sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('breakeven_volume_ngn',              sa.Numeric(15, 2), nullable=False, server_default='0'),
            sa.Column('npl_status',  sa.String(10), nullable=False, server_default="'green'"),
            sa.Column('drp_status',  sa.String(10), nullable=False, server_default="'green'"),
            sa.Column('elr_status',  sa.String(10), nullable=False, server_default="'green'"),
            sa.Column('ofct_status', sa.String(10), nullable=False, server_default="'green'"),
            sa.Column('stv_status',  sa.String(10), nullable=False, server_default="'green'"),
            sa.Column('created_at', sa.DateTime(timezone=True),
                      server_default=sa.text("timezone('utc', now())")),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('snapshot_date', name='uq_daily_metrics_date'),
        )
        op.create_index('idx_metrics_snapshot_date', 'daily_system_metrics',
                        ['snapshot_date'], postgresql_ops={'snapshot_date': 'DESC'})

    # ── OTP records with rate-limit tracking ─────────────────────
    if 'otp_records' not in existing_tables:
        op.create_table(
            'otp_records',
            sa.Column('id', sa.String(), nullable=False,
                      server_default=sa.text("gen_random_uuid()::text")),
            sa.Column('target',    sa.String(255), nullable=False),
            sa.Column('channel',   sa.String(10),  nullable=False),
            sa.Column('code_hash', sa.String(64),  nullable=False),
            sa.Column('purpose',   sa.String(50),  nullable=False, server_default="'phone_verify'"),
            sa.Column('is_used',   sa.Boolean(),   nullable=False, server_default='false'),
            sa.Column('attempts',  sa.Integer(),   nullable=False, server_default='0'),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True),
                      server_default=sa.text("timezone('utc', now())")),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_otp_target_channel_created',
                        'otp_records', ['target', 'channel', 'created_at'])


def downgrade():
    op.drop_index('idx_otp_target_channel_created', table_name='otp_records')
    op.drop_table('otp_records')
    op.drop_index('idx_metrics_snapshot_date', table_name='daily_system_metrics')
    op.drop_table('daily_system_metrics')

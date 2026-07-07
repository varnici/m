"""phone_otps table for custom phone OTP flow

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-03
"""

from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    existing = sa.inspect(conn).get_table_names()

    if 'phone_otps' not in existing:
        op.create_table(
            'phone_otps',
            sa.Column('id', sa.String(), nullable=False,
                      server_default=sa.text("gen_random_uuid()::text")),
            sa.Column('phone',    sa.String(20), nullable=False),
            sa.Column('otp_hash', sa.Text(),     nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True),
                      server_default=sa.text("timezone('utc', now())")),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_phone_otps_phone', 'phone_otps', ['phone'])


def downgrade():
    op.drop_index('idx_phone_otps_phone', table_name='phone_otps')
    op.drop_table('phone_otps')

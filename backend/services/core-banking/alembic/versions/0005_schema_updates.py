"""update schema for onboarding and product health

Revision ID: 0005_schema_updates
Revises: 0004_cluster_deliveries
Create Date: 2026-04-26 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005_schema_updates'
down_revision = '0004_cluster_deliveries'
branch_labels = None
depends_on = None


def upgrade():
    # --- Products Table ---
    op.add_column('products', sa.Column('rating', sa.Float(), nullable=False, server_default='5.0'))
    op.add_column('products', sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'))

    # --- Users Table ---
    op.add_column('users', sa.Column('trading_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('business_category', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bank_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('account_number', sa.String(), nullable=True))
    op.add_column('users', sa.Column('tin', sa.String(), nullable=True))
    op.add_column('users', sa.Column('ownership_type', sa.String(), nullable=True))
    op.add_column('users', sa.Column('registration_status', sa.String(), nullable=True))
    op.add_column('users', sa.Column('location', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('hashed_pattern', sa.String(), nullable=True))
    op.add_column('users', sa.Column('security_type', sa.String(), nullable=False, server_default='pin'))


def downgrade():
    # --- Users Table ---
    op.drop_column('users', 'security_type')
    op.drop_column('users', 'hashed_pattern')
    op.drop_column('users', 'location')
    op.drop_column('users', 'registration_status')
    op.drop_column('users', 'ownership_type')
    op.drop_column('users', 'tin')
    op.drop_column('users', 'account_number')
    op.drop_column('users', 'bank_name')
    op.drop_column('users', 'business_category')
    op.drop_column('users', 'trading_name')

    # --- Products Table ---
    op.drop_column('products', 'review_count')
    op.drop_column('products', 'rating')

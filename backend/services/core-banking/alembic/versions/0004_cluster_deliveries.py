"""Add cluster delivery and participant tables with PostGIS support

Revision ID: 0004_cluster_deliveries
Revises: 0003_transport_profiles_bookings
Create Date: 2026-04-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision = '0004_cluster_deliveries'
down_revision = '0003_transport_profiles_bookings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    op.create_table(
        'cluster_deliveries',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='forming'),
        sa.Column('target_participants', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('participants_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('center_latitude', sa.Float(), nullable=False),
        sa.Column('center_longitude', sa.Float(), nullable=False),
        sa.Column('center_geom', Geometry(geometry_type='POINT', srid=4326), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.execute('CREATE INDEX IF NOT EXISTS ix_cluster_deliveries_center_geom ON cluster_deliveries USING GIST (center_geom)')

    op.create_table(
        'cluster_participants',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('cluster_id', sa.String(), nullable=False),
        sa.Column('user_label', sa.String(), nullable=False),
        sa.Column('order_reference', sa.String(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_cluster_participants_cluster_id', 'cluster_participants', ['cluster_id'])


def downgrade() -> None:
    op.drop_index('ix_cluster_participants_cluster_id', table_name='cluster_participants')
    op.drop_table('cluster_participants')
    op.execute('DROP INDEX IF EXISTS ix_cluster_deliveries_center_geom')
    op.drop_table('cluster_deliveries')

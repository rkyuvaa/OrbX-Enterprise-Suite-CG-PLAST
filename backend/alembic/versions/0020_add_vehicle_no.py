"""add_vehicle_no

Revision ID: 0020_add_vehicle_no
Revises: 9b9ef6b1ffdf
Create Date: 2026-07-23 22:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0020_add_vehicle_no'
down_revision: Union[str, None] = '9b9ef6b1ffdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invoices', sa.Column('vehicle_no', sa.String(length=50), nullable=True))
    op.add_column('stock_transfers', sa.Column('vehicle_no', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('stock_transfers', 'vehicle_no')
    op.drop_column('invoices', 'vehicle_no')

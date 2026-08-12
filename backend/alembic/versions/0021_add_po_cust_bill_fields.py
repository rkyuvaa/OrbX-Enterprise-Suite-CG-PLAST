"""add_po_cust_bill_fields

Revision ID: 0021_add_po_cust_bill_fields
Revises: 0020_add_vehicle_no
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0021_add_po_cust_bill_fields'
down_revision: Union[str, None] = '0020_add_vehicle_no'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('purchase_orders', sa.Column('cust_bill_date', sa.Date(), nullable=True))
    op.add_column('purchase_orders', sa.Column('cust_bill_no', sa.String(length=100), nullable=True))
    op.add_column('purchase_orders', sa.Column('ref', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('purchase_orders', 'ref')
    op.drop_column('purchase_orders', 'cust_bill_no')
    op.drop_column('purchase_orders', 'cust_bill_date')

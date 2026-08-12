"""add_my_ledger_adjustments

Revision ID: 0022_add_my_ledger_adjustments
Revises: 0021_add_po_cust_bill_fields
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0022_add_my_ledger_adjustments'
down_revision: Union[str, None] = '0021_add_po_cust_bill_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'my_ledger_adjustments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('party_type', sa.String(length=30), nullable=False),
        sa.Column('party_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tx_key', sa.String(length=100), nullable=False),
        sa.Column('tx_type', sa.String(length=50), nullable=True),
        sa.Column('reference_no', sa.String(length=100), nullable=True),
        sa.Column('additional_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('party_type', 'party_id', 'tx_key', name='uq_my_ledger_party_tx_key')
    )
    op.create_index(op.f('ix_my_ledger_adjustments_party_type'), 'my_ledger_adjustments', ['party_type'], unique=False)
    op.create_index(op.f('ix_my_ledger_adjustments_party_id'), 'my_ledger_adjustments', ['party_id'], unique=False)
    op.create_index(op.f('ix_my_ledger_adjustments_tx_key'), 'my_ledger_adjustments', ['tx_key'], unique=False)
    op.create_index(op.f('ix_my_ledger_adjustments_company_id'), 'my_ledger_adjustments', ['company_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_my_ledger_adjustments_company_id'), table_name='my_ledger_adjustments')
    op.drop_index(op.f('ix_my_ledger_adjustments_tx_key'), table_name='my_ledger_adjustments')
    op.drop_index(op.f('ix_my_ledger_adjustments_party_id'), table_name='my_ledger_adjustments')
    op.drop_index(op.f('ix_my_ledger_adjustments_party_type'), table_name='my_ledger_adjustments')
    op.drop_table('my_ledger_adjustments')

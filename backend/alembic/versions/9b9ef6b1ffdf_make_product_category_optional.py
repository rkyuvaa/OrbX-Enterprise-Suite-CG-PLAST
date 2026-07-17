"""make_product_category_optional

Revision ID: 9b9ef6b1ffdf
Revises: 9a9ef6b1fddd
Create Date: 2026-07-17 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b9ef6b1ffdf'
down_revision: Union[str, None] = '9a9ef6b1fddd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make category_id nullable in products table
    op.alter_column('products', 'category_id',
               existing_type=sa.Uuid(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('products', 'category_id',
               existing_type=sa.Uuid(),
               nullable=False)

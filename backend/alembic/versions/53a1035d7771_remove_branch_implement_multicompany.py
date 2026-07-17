"""remove_branch_implement_multicompany

Revision ID: 53a1035d7771
Revises: ad0df63dce68
Create Date: 2026-07-15 08:55:56.850543

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '53a1035d7771'
down_revision: Union[str, None] = 'ad0df63dce68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create user_company_association table
    op.create_table('user_company_association',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('company_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'company_id')
    )
    
    # 2. Add columns to companies (nullable at first, or with default values)
    op.add_column('companies', sa.Column('pan', sa.String(length=10), nullable=True))
    op.add_column('companies', sa.Column('code', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('so_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('so_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('so_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('invoice_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('invoice_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('invoice_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('challan_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('challan_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('challan_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('po_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('po_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('po_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('grn_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('grn_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('grn_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('receipt_prefix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('receipt_suffix', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('receipt_next_number', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('invoice_terms', sa.String(length=500), nullable=True))
    op.add_column('companies', sa.Column('invoice_footer', sa.String(length=255), nullable=True))

    # Migrate branch sequence settings to company if branches exist
    op.execute("""
        UPDATE companies c 
        SET code = COALESCE(b.code, 'HQ'),
            so_prefix = COALESCE(b.so_prefix, 'SO-'),
            so_suffix = COALESCE(b.so_suffix, ''),
            so_next_number = COALESCE(b.so_next_number, 1),
            invoice_prefix = COALESCE(b.invoice_prefix, 'INV-'),
            invoice_suffix = COALESCE(b.invoice_suffix, ''),
            invoice_next_number = COALESCE(b.invoice_next_number, 1),
            challan_prefix = COALESCE(b.challan_prefix, 'DC-'),
            challan_suffix = COALESCE(b.challan_suffix, ''),
            challan_next_number = COALESCE(b.challan_next_number, 1),
            po_prefix = COALESCE(b.po_prefix, 'PO-'),
            po_suffix = COALESCE(b.po_suffix, ''),
            po_next_number = COALESCE(b.po_next_number, 1),
            grn_prefix = COALESCE(b.grn_prefix, 'GRN-'),
            grn_suffix = COALESCE(b.grn_suffix, ''),
            grn_next_number = COALESCE(b.grn_next_number, 1),
            receipt_prefix = COALESCE(b.receipt_prefix, 'RCPT-'),
            receipt_suffix = COALESCE(b.receipt_suffix, ''),
            receipt_next_number = COALESCE(b.receipt_next_number, 1),
            invoice_terms = b.invoice_terms,
            invoice_footer = b.invoice_footer
        FROM branches b 
        WHERE b.company_id = c.id
    """)

    # Populate default sequences for companies without branches
    op.execute("""
        UPDATE companies 
        SET code = 'HQ',
            so_prefix = 'SO-',
            so_suffix = '',
            so_next_number = 1,
            invoice_prefix = 'INV-',
            invoice_suffix = '',
            invoice_next_number = 1,
            challan_prefix = 'DC-',
            challan_suffix = '',
            challan_next_number = 1,
            po_prefix = 'PO-',
            po_suffix = '',
            po_next_number = 1,
            grn_prefix = 'GRN-',
            grn_suffix = '',
            grn_next_number = 1,
            receipt_prefix = 'RCPT-',
            receipt_suffix = '',
            receipt_next_number = 1
        WHERE code IS NULL
    """)

    # Make company sequence fields non-nullable
    for col in ['code', 'so_prefix', 'so_suffix', 'so_next_number', 'invoice_prefix', 'invoice_suffix', 'invoice_next_number', 'challan_prefix', 'challan_suffix', 'challan_next_number', 'po_prefix', 'po_suffix', 'po_next_number', 'grn_prefix', 'grn_suffix', 'grn_next_number', 'receipt_prefix', 'receipt_suffix', 'receipt_next_number']:
        op.alter_column('companies', col, nullable=False)

    op.create_index(op.f('ix_companies_code'), 'companies', ['code'], unique=True)

    # 3. Add company_id columns to all other tables
    tables_to_add_company = [
        ('customers', True),      # (table_name, is_nullable)
        ('suppliers', True),
        ('product_pricing', True),
        ('journal_entries', True),
        ('direct_sales', False),
        ('grn', False),
        ('invoices', False),
        ('manufacturing_processes', False),
        ('production_entries', False),
        ('purchase_entries', False),
        ('purchase_orders', False),
        ('purchase_returns', False),
        ('raw_material_receipts', False),
        ('sales_orders', False),
        ('stock_transactions', False),
        ('stock_transfers', False)
    ]

    for tbl, nullable in tables_to_add_company:
        op.add_column(tbl, sa.Column('company_id', sa.Uuid(), nullable=True))

    # 4. Migrate transaction and master data from branches to companies
    for tbl, nullable in tables_to_add_company:
        # Stock transfers has source_branch_id instead of branch_id
        if tbl == 'stock_transfers':
            op.execute("UPDATE stock_transfers t SET company_id = b.company_id FROM branches b WHERE t.source_branch_id = b.id")
        elif tbl == 'journal_entries':
            # journal entries can default to the first company or match a linked transaction (we will map them via reference updates or default to first company)
            op.execute("""
                UPDATE journal_entries je
                SET company_id = COALESCE(
                    (SELECT pe.company_id FROM purchase_entries pe WHERE pe.id = je.reference_id AND je.reference_type = 'PurchaseEntry'),
                    (SELECT inv.company_id FROM invoices inv WHERE inv.id = je.reference_id AND je.reference_type = 'Invoice'),
                    (SELECT pr.company_id FROM purchase_returns pr WHERE pr.id = je.reference_id AND je.reference_type = 'PurchaseReturn'),
                    (SELECT id FROM companies LIMIT 1)
                )
            """)
        else:
            op.execute(f"UPDATE {tbl} t SET company_id = b.company_id FROM branches b WHERE t.branch_id = b.id")
        
        # If any record ended up with null company_id for non-nullable tables, fall back to first company
        if not nullable:
            op.execute(f"UPDATE {tbl} SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL")
            op.alter_column(tbl, 'company_id', nullable=False)

    # 5. Populate user companies association table
    op.execute("INSERT INTO user_company_association (user_id, company_id) SELECT u.id, b.company_id FROM users u JOIN branches b ON u.branch_id = b.id ON CONFLICT DO NOTHING")
    # For global/all branch users, associate them with all companies
    op.execute("INSERT INTO user_company_association (user_id, company_id) SELECT u.id, c.id FROM users u CROSS JOIN companies c WHERE u.branch_id IS NULL ON CONFLICT DO NOTHING")

    # 6. Create indexes and foreign keys for company_id on target tables
    for tbl, nullable in tables_to_add_company:
        op.create_index(op.f(f'ix_{tbl}_company_id'), tbl, ['company_id'], unique=False)
        ondelete = 'CASCADE' if tbl in ['product_pricing', 'journal_entries'] else ('SET NULL' if nullable else 'RESTRICT')
        op.create_foreign_key(None, tbl, 'companies', ['company_id'], ['id'], ondelete=ondelete)

    # 7. Merge stock records in current_stock
    # Sum duplicates per product_id, delete old, drop branch_id, make product_id unique
    op.execute("""
        CREATE TEMP TABLE temp_current_stock AS 
        SELECT product_id, SUM(qty) as total_qty 
        FROM current_stock 
        GROUP BY product_id
    """)
    op.execute("DELETE FROM current_stock")
    op.execute("ALTER TABLE current_stock DROP CONSTRAINT IF EXISTS current_stock_branch_id_fkey")
    op.execute("ALTER TABLE current_stock DROP CONSTRAINT IF EXISTS uq_product_branch_stock")
    op.execute("DROP INDEX IF EXISTS uq_product_branch_stock")
    op.drop_column('current_stock', 'branch_id')
    op.execute("DROP INDEX IF EXISTS ix_current_stock_branch_id")
    op.execute("DROP INDEX IF EXISTS ix_current_stock_product_id")
    
    # Re-insert consolidated stock
    op.execute("""
        INSERT INTO current_stock (id, product_id, qty, created_at, updated_at, is_active) 
        SELECT gen_random_uuid(), product_id, total_qty, now(), now(), true 
        FROM temp_current_stock
    """)
    op.create_index(op.f('ix_current_stock_product_id'), 'current_stock', ['product_id'], unique=True)

    # 8. Drop old branch_id columns and constraints
    for tbl, nullable in tables_to_add_company:
        if tbl == 'stock_transfers':
            op.execute("ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_source_branch_id_fkey")
            op.execute("ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_destination_branch_id_fkey")
            op.drop_column('stock_transfers', 'source_branch_id')
            op.drop_column('stock_transfers', 'destination_branch_id')
            op.execute("DROP INDEX IF EXISTS ix_stock_transfers_source_branch_id")
            op.execute("DROP INDEX IF EXISTS ix_stock_transfers_destination_branch_id")
        elif tbl == 'journal_entries':
            # journal_entries never had branch_id
            pass
        else:
            op.execute(f"ALTER TABLE {tbl} DROP CONSTRAINT IF EXISTS {tbl}_branch_id_fkey")
            op.drop_column(tbl, 'branch_id')
            op.execute(f"DROP INDEX IF EXISTS ix_{tbl}_branch_id")

    # Drop users branch_id
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_id_fkey")
    op.drop_column('users', 'branch_id')


    # 9. Drop branches table
    op.drop_index('ix_branches_branch_name', table_name='branches')
    op.drop_index('ix_branches_code', table_name='branches')
    op.drop_index('ix_branches_company_id', table_name='branches')
    op.drop_index('ix_branches_id', table_name='branches')
    op.drop_index('ix_branches_is_active', table_name='branches')
    op.drop_table('branches')


def downgrade() -> None:
    pass

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.auth import Role, Permission, User
from app.models.business import Company, Customer, Supplier
from app.models.product import Product, ProductCategory
from app.models.recycling import Recipe, RecipeItem


async def init_db(db: AsyncSession) -> None:
    # 1. Create Default Company
    query_company = await db.execute(
        select(Company).filter(
            (Company.name == settings.FIRST_COMPANY_NAME) |
            (Company.code == settings.FIRST_BRANCH_CODE)
        )
    )
    company = query_company.scalar_one_or_none()
    if not company:
        company = Company(
            name=settings.FIRST_COMPANY_NAME,
            code=settings.FIRST_BRANCH_CODE,  # Use branch code as default company code
            logo="",
            address="123 Corporate Blvd, Silicon Valley",
            gstin="22AAAAA0000A1Z5",
            email="info@orbx.com",
            phone="+1-555-0199",
            financial_year_start="2026-04-01",
            invoice_prefix="INV-",
            invoice_next_number=1,
            invoice_terms="1. Payment is due within 15 days of invoice date.\n2. Interest of 1.5% per month will be charged on late payments.",
            invoice_footer="Thank you for your business!"
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)
        print(f"Company created: {company.name}")

    # 2. Create Default Roles
    roles_to_create = [
        {"name": "Super Admin", "desc": "Full root-level administration access to all modules."},
        {"name": "Admin", "desc": "Standard administration access (except Users & Roles and Backups)."},
        {"name": "Branch Manager", "desc": "Management control over local masters and transactional processes."},
        {"name": "Sales Executive", "desc": "Execute customer interactions, sales orders, billing, and payment processing."},
        {"name": "Purchase Manager", "desc": "Manage supplier relations, procurement orders, and receipts."},
    ]
    
    seeded_roles = {}
    for r_data in roles_to_create:
        query_role = await db.execute(select(Role).filter(Role.name == r_data["name"]))
        role = query_role.scalar_one_or_none()
        if not role:
            role = Role(
                name=r_data["name"],
                description=r_data["desc"]
            )
            db.add(role)
            await db.commit()
            await db.refresh(role)
            print(f"Role created: {role.name}")
        seeded_roles[r_data["name"]] = role

    # 3. Seed Permissions Matrix
    modules = ["masters", "purchase", "inventory", "sales", "payments", "reports", "admin"]
    actions = ["view", "create", "edit", "delete"]

    # For each role, seed the permissions matrix
    # Super Admin -> All allowed
    super_admin_role = seeded_roles["Super Admin"]
    for mod in modules:
        for act in actions:
            query_p = await db.execute(
                select(Permission).filter(
                    Permission.role_id == super_admin_role.id,
                    Permission.module == mod,
                    Permission.action == act
                )
            )
            p = query_p.scalar_one_or_none()
            if not p:
                p = Permission(
                    role_id=super_admin_role.id,
                    module=mod,
                    action=act,
                    is_allowed=True
                )
                db.add(p)

    # Admin -> All allowed (access checked in code guards)
    admin_role = seeded_roles["Admin"]
    for mod in modules:
        for act in actions:
            query_p = await db.execute(
                select(Permission).filter(
                    Permission.role_id == admin_role.id,
                    Permission.module == mod,
                    Permission.action == act
                )
            )
            p = query_p.scalar_one_or_none()
            if not p:
                p = Permission(
                    role_id=admin_role.id,
                    module=mod,
                    action=act,
                    is_allowed=True
                )
                db.add(p)
    
    # Branch Manager -> Most allowed (no deletes, no admin edits except views)
    branch_mgr_role = seeded_roles["Branch Manager"]
    for mod in modules:
        for act in actions:
            query_p = await db.execute(
                select(Permission).filter(
                    Permission.role_id == branch_mgr_role.id,
                    Permission.module == mod,
                    Permission.action == act
                )
            )
            p = query_p.scalar_one_or_none()
            if not p:
                allowed = False
                if mod in ["masters", "purchase", "inventory", "sales", "payments"]:
                    allowed = (act != "delete") # view, create, edit allowed
                elif mod == "reports":
                    allowed = (act == "view") # only view reports
                elif mod == "admin":
                    allowed = (act == "view") # only view company configs
                p = Permission(
                    role_id=branch_mgr_role.id,
                    module=mod,
                    action=act,
                    is_allowed=allowed
                )
                db.add(p)

    # Sales Executive -> Customer, Sales, Payments (view, create, edit)
    sales_exec_role = seeded_roles["Sales Executive"]
    for mod in modules:
        for act in actions:
            query_p = await db.execute(
                select(Permission).filter(
                    Permission.role_id == sales_exec_role.id,
                    Permission.module == mod,
                    Permission.action == act
                )
            )
            p = query_p.scalar_one_or_none()
            if not p:
                allowed = False
                if mod in ["sales", "payments"]:
                    allowed = (act != "delete")
                elif mod == "masters":
                    allowed = (act in ["view", "create"]) # cannot edit or delete customers/products
                elif mod == "inventory":
                    allowed = (act == "view") # only see stock
                p = Permission(
                    role_id=sales_exec_role.id,
                    module=mod,
                    action=act,
                    is_allowed=allowed
                )
                db.add(p)

    # Commit all seeded permissions
    await db.commit()
    print("Permissions matrix seeded successfully.")

    # 4. Create Default Super Admin User
    from sqlalchemy.orm import selectinload
    query_user = await db.execute(
        select(User)
        .filter(User.email == settings.FIRST_SUPERUSER_EMAIL)
        .options(selectinload(User.companies))
    )
    user = query_user.scalar_one_or_none()
    if not user:
        user = User(
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Super Admin",
            role_id=super_admin_role.id,
            companies=[company]
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Super Admin user seeded: {user.email}")
    else:
        # Keep password fresh / updated to FIRST_SUPERUSER_PASSWORD
        user.hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
        user.companies = [company]
        db.add(user)
        await db.commit()

    # 5. Seed Customers & Suppliers for Recycling
    query_cust = await db.execute(select(Customer).filter(Customer.name == "Direct Scrap Buyer Ltd"))
    cust = query_cust.scalar_one_or_none()
    if not cust:
        cust = Customer(
            name="Direct Scrap Buyer Ltd",
            code="CUST-RECYCLING",
            email="buyer@scrapbuyer.com",
            phone="+91-9876543210",
            billing_address="Industrial Area Phase 1, New Delhi",
            shipping_address="Industrial Area Phase 1, New Delhi",
            gstin="07AAAAA1111A1Z1",
            company_id=company.id
        )
        db.add(cust)
        await db.commit()
        await db.refresh(cust)

    query_supp = await db.execute(select(Supplier).filter(Supplier.name == "Global Recycling Scrap Supplier"))
    supp = query_supp.scalar_one_or_none()
    if not supp:
        supp = Supplier(
            name="Global Recycling Scrap Supplier",
            code="SUPP-RECYCLING",
            email="supplier@globalsupplies.com",
            phone="+91-8765432109",
            address="Scrap Yard Colony, Mumbai",
            gstin="27BBBBB2222B2Z2",
            company_id=company.id
        )
        db.add(supp)
        await db.commit()
        await db.refresh(supp)

    # 7. Seed Product Category for Recycling
    query_cat = await db.execute(select(ProductCategory).filter(ProductCategory.name == "Recycling Materials"))
    cat = query_cat.scalar_one_or_none()
    if not cat:
        cat = ProductCategory(
            name="Recycling Materials",
            description="Raw scrap, components, and recycled finished goods."
        )
        db.add(cat)
        await db.commit()
        await db.refresh(cat)

    # 8. Seed Products
    products_to_seed = [
        {"name": "HDPE Plastic Scrap Blue", "sku": "RAW-HDPE-BLUE", "product_type": "RAW", "uom": "KG", "purchase_price": 45.0, "selling_price": 55.0},
        {"name": "LDPE Plastic Film Scrap", "sku": "RAW-LDPE-FILM", "product_type": "RAW", "uom": "KG", "purchase_price": 35.0, "selling_price": 45.0},
        {"name": "Plastic Masterbatch Colorant", "sku": "CMP-MASTERBATCH", "product_type": "COMPONENT", "uom": "KG", "purchase_price": 120.0, "selling_price": 150.0},
        {"name": "HDPE Blue Chips (Recycled)", "sku": "FGD-HDPE-BLUE", "product_type": "FINISHED", "uom": "KG", "purchase_price": 50.0, "selling_price": 75.0},
        {"name": "LDPE Clear Granules", "sku": "FGD-LDPE-CLEAR", "product_type": "FINISHED", "uom": "KG", "purchase_price": 40.0, "selling_price": 65.0},
    ]

    seeded_products = {}
    for p_data in products_to_seed:
        query_p = await db.execute(select(Product).filter(Product.sku == p_data["sku"]))
        prod = query_p.scalar_one_or_none()
        if not prod:
            prod = Product(
                name=p_data["name"],
                sku=p_data["sku"],
                product_type=p_data["product_type"],
                category_id=cat.id,
                uom=p_data["uom"],
                purchase_price=p_data["purchase_price"],
                selling_price=p_data["selling_price"],
                tax_rate=18.0,
                min_stock_level=100.0
            )
            db.add(prod)
            await db.commit()
            await db.refresh(prod)
            print(f"Product created: {prod.name}")
        seeded_products[p_data["sku"]] = prod

    # 9. Seed Recipe (BOM)
    hdpe_fg = seeded_products["FGD-HDPE-BLUE"]
    query_rec = await db.execute(select(Recipe).filter(Recipe.finished_product_id == hdpe_fg.id))
    recipe = query_rec.scalar_one_or_none()
    if not recipe:
        recipe = Recipe(
            finished_product_id=hdpe_fg.id,
            name="Standard HDPE Blue Chip Recipe",
            expected_loss_percentage=2.0
        )
        db.add(recipe)
        await db.commit()
        await db.refresh(recipe)

        # Add recipe items
        item_scrap = RecipeItem(
            recipe_id=recipe.id,
            product_id=seeded_products["RAW-HDPE-BLUE"].id,
            qty=0.98
        )
        item_color = RecipeItem(
            recipe_id=recipe.id,
            product_id=seeded_products["CMP-MASTERBATCH"].id,
            qty=0.02
        )
        db.add(item_scrap)
        db.add(item_color)
        await db.commit()
        print(f"Recipe created: {recipe.name}")


async def main() -> None:
    print("Seeding database...")
    async with SessionLocal() as session:
        await init_db(session)
    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())

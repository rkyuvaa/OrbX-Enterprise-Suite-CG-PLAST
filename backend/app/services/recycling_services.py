from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.business import Supplier, Customer, Company
from app.models.inventory import CurrentStock
from app.models.recycling import (
    RawMaterialReceipt, Recipe, RecipeItem,
    ProductionEntry, ProductionConsumedItem, DirectSale,
    ManufacturingProcess, ManufacturingProcessItem
)
from app.services.tx_services import TxServices
from app.schemas.recycling import (
    RawMaterialReceiptCreate, RecipeCreate,
    ProductionEntryCreate, DirectSaleCreate,
    ManufacturingProcessCreate, ManufacturingProcessUpdate,
    ManufacturingProcessFinish
)


class RecyclingServices:
    # ==========================================
    # RAW MATERIAL RECEIPTS
    # ==========================================
    @staticmethod
    async def create_receipt(db: AsyncSession, data: RawMaterialReceiptCreate) -> RawMaterialReceipt:
        # Validate product is a Raw Material
        q_p = await db.execute(select(Product).filter(Product.id == data.product_id))
        product = q_p.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        if product.product_type != "RAW":
            raise HTTPException(status_code=400, detail="Only RAW material products can be received here.")

        # Resolve company_id if zero or invalid
        company_id = data.company_id
        q_co_exists = await db.execute(select(Company).filter(Company.id == company_id))
        if not q_co_exists.scalar_one_or_none() or str(company_id) == "00000000-0000-0000-0000-000000000000":
            q_any_co = await db.execute(select(Company).limit(1))
            any_company = q_any_co.scalar_one_or_none()
            if any_company:
                company_id = any_company.id
            else:
                raise HTTPException(status_code=400, detail="No active company found in the system.")

        # Calculate total cost
        total_cost = data.qty * data.rate

        # Get current stock to compute moving average (global inventory)
        q_stock = await db.execute(
            select(CurrentStock).filter(
                CurrentStock.product_id == data.product_id
            )
        )
        stock = q_stock.scalar_one_or_none()
        current_qty = stock.qty if stock else 0.0

        # Calculate new moving average purchase price
        if current_qty > 0:
            new_avg = ((current_qty * product.purchase_price) + (data.qty * data.rate)) / (current_qty + data.qty)
        else:
            new_avg = data.rate

        # Update product purchase price
        product.purchase_price = new_avg
        db.add(product)

        # Create receipt
        receipt = RawMaterialReceipt(
            supplier_id=data.supplier_id,
            product_id=data.product_id,
            company_id=company_id,
            qty=data.qty,
            rate=data.rate,
            total_cost=total_cost,
            date=data.date or datetime.utcnow()
        )
        db.add(receipt)
        await db.flush()

        # Update inventory stock levels (global)
        await TxServices.update_stock(
            db=db,
            product_id=data.product_id,
            company_id=company_id,
            qty_change=data.qty,
            tx_type="In",
            ref_type="Raw Material Receipt",
            ref_id=receipt.id,
            reason=f"Scrap intake receipt. Supplier ID: {data.supplier_id}"
        )

        await db.commit()

        # Re-fetch with relationships
        q_res = await db.execute(
            select(RawMaterialReceipt)
            .filter(RawMaterialReceipt.id == receipt.id)
            .options(
                selectinload(RawMaterialReceipt.supplier),
                selectinload(RawMaterialReceipt.product)
            )
        )
        o = q_res.scalar_one()
        o.supplier_name = o.supplier.name
        o.product_name = o.product.name
        o.sku = o.product.sku
        o.uom = o.product.uom
        return o

    @staticmethod
    async def list_receipts(db: AsyncSession, company_id: Optional[UUID] = None) -> List[RawMaterialReceipt]:
        stmt = (
            select(RawMaterialReceipt)
            .options(
                selectinload(RawMaterialReceipt.supplier),
                selectinload(RawMaterialReceipt.product)
            )
            .order_by(RawMaterialReceipt.date.desc())
        )
        if company_id:
            stmt = stmt.filter(RawMaterialReceipt.company_id == company_id)
        query = await db.execute(stmt)
        results = list(query.scalars().all())
        for r in results:
            r.supplier_name = r.supplier.name
            r.product_name = r.product.name
            r.sku = r.product.sku
            r.uom = r.product.uom
        return results

    # ==========================================
    # RECIPES (BOM)
    # ==========================================
    @staticmethod
    async def create_recipe(db: AsyncSession, data: RecipeCreate) -> Recipe:
        # Check if recipe already exists for this finished product
        q_existing = await db.execute(select(Recipe).filter(Recipe.finished_product_id == data.finished_product_id))
        if q_existing.scalars().first():
            raise HTTPException(status_code=400, detail="A recipe template already exists for this finished product.")

        recipe = Recipe(
            finished_product_id=data.finished_product_id,
            name=data.name,
            expected_loss_percentage=data.expected_loss_percentage
        )
        db.add(recipe)
        await db.flush()

        for item in data.items:
            recipe_item = RecipeItem(
                recipe_id=recipe.id,
                product_id=item.product_id,
                qty=item.qty
            )
            db.add(recipe_item)

        await db.commit()

        # Re-fetch
        q_res = await db.execute(
            select(Recipe)
            .filter(Recipe.id == recipe.id)
            .options(
                selectinload(Recipe.finished_product),
                selectinload(Recipe.items).selectinload(RecipeItem.product)
            )
        )
        o = q_res.scalar_one()
        o.finished_product_name = o.finished_product.name
        o.finished_product_sku = o.finished_product.sku
        for item in o.items:
            item.product_name = item.product.name
            item.sku = item.product.sku
            item.uom = item.product.uom
        return o

    @staticmethod
    async def list_recipes(db: AsyncSession) -> List[Recipe]:
        stmt = (
            select(Recipe)
            .options(
                selectinload(Recipe.finished_product),
                selectinload(Recipe.items).selectinload(RecipeItem.product)
            )
            .order_by(Recipe.name.asc())
        )
        query = await db.execute(stmt)
        results = list(query.scalars().all())
        for r in results:
            r.finished_product_name = r.finished_product.name
            r.finished_product_sku = r.finished_product.sku
            for item in r.items:
                item.product_name = item.product.name
                item.sku = item.product.sku
                item.uom = item.product.uom
        return results

    @staticmethod
    async def update_recipe(db: AsyncSession, recipe_id: UUID, data: RecipeCreate) -> Recipe:
        q = await db.execute(select(Recipe).filter(Recipe.id == recipe_id))
        recipe = q.scalar_one_or_none()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found.")

        # Check if finished_product_id changed and if another recipe exists
        if recipe.finished_product_id != data.finished_product_id:
            q_existing = await db.execute(
                select(Recipe)
                .filter(Recipe.finished_product_id == data.finished_product_id, Recipe.id != recipe_id)
            )
            if q_existing.scalars().first():
                raise HTTPException(status_code=400, detail="A recipe template already exists for this finished product.")

        recipe.finished_product_id = data.finished_product_id
        recipe.name = data.name
        recipe.expected_loss_percentage = data.expected_loss_percentage
        db.add(recipe)

        # Delete old recipe items
        q_old = await db.execute(select(RecipeItem).filter(RecipeItem.recipe_id == recipe_id))
        for item in q_old.scalars().all():
            await db.delete(item)

        # Create new recipe items
        for item in data.items:
            recipe_item = RecipeItem(
                recipe_id=recipe.id,
                product_id=item.product_id,
                qty=item.qty
            )
            db.add(recipe_item)

        await db.commit()

        # Re-fetch
        q_res = await db.execute(
            select(Recipe)
            .filter(Recipe.id == recipe.id)
            .options(
                selectinload(Recipe.finished_product),
                selectinload(Recipe.items).selectinload(RecipeItem.product)
            )
        )
        o = q_res.scalar_one()
        o.finished_product_name = o.finished_product.name
        o.finished_product_sku = o.finished_product.sku
        for item in o.items:
            item.product_name = item.product.name
            item.sku = item.product.sku
            item.uom = item.product.uom
        return o

    @staticmethod
    async def delete_recipe(db: AsyncSession, recipe_id: UUID) -> None:
        q = await db.execute(select(Recipe).filter(Recipe.id == recipe_id))
        recipe = q.scalar_one_or_none()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found.")
        await db.delete(recipe)
        await db.commit()

    # ==========================================
    # MANUFACTURING (PRODUCTION RUNS)
    # ==========================================
    @staticmethod
    async def create_production(db: AsyncSession, data: ProductionEntryCreate) -> ProductionEntry:
        # Validate finished good product
        q_fg = await db.execute(select(Product).filter(Product.id == data.finished_product_id))
        fg_product = q_fg.scalar_one_or_none()
        if not fg_product:
            raise HTTPException(status_code=404, detail="Finished product not found.")
        if fg_product.product_type != "FINISHED":
            raise HTTPException(status_code=400, detail="Only FINISHED products can be produced.")

        # Resolve company_id if zero or invalid
        company_id = data.company_id
        q_co_exists = await db.execute(select(Company).filter(Company.id == company_id))
        if not q_co_exists.scalar_one_or_none() or str(company_id) == "00000000-0000-0000-0000-000000000000":
            q_any_co = await db.execute(select(Company).limit(1))
            any_company = q_any_co.scalar_one_or_none()
            if any_company:
                company_id = any_company.id
            else:
                raise HTTPException(status_code=400, detail="No active company found in the system.")

        # Create ProductionEntry instance
        entry = ProductionEntry(
            finished_product_id=data.finished_product_id,
            recipe_id=data.recipe_id,
            company_id=company_id,
            output_weight=data.output_weight,
            production_expenses=data.production_expenses,
            date=data.date or datetime.utcnow()
        )
        db.add(entry)
        await db.flush()

        # Consumed items processing
        total_input_weight = 0.0
        raw_material_cost = 0.0
        component_cost = 0.0

        for item in data.consumed_items:
            # Fetch product details for unit cost
            q_p = await db.execute(select(Product).filter(Product.id == item.product_id))
            prod = q_p.scalar_one_or_none()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Consumed product ID {item.product_id} not found.")

            # Calculate cost
            unit_cost = prod.purchase_price
            total_cost = item.qty * unit_cost

            # Accumulate costs and input weights
            if prod.product_type == "RAW":
                total_input_weight += item.qty
                raw_material_cost += total_cost
            else:
                component_cost += total_cost

            # Log consumed item record
            consumed_item = ProductionConsumedItem(
                production_entry_id=entry.id,
                product_id=item.product_id,
                qty=item.qty,
                unit_cost=unit_cost,
                total_cost=total_cost
            )
            db.add(consumed_item)

            # Deduct stock of consumed ingredient (global stock)
            await TxServices.update_stock(
                db=db,
                product_id=item.product_id,
                company_id=company_id,
                qty_change=-item.qty,
                tx_type="Out",
                ref_type="Production Consumption",
                ref_id=entry.id,
                reason=f"Consumed in production run. Output FG ID: {data.finished_product_id}"
            )

        # Weight Loss Calculations
        weight_loss = total_input_weight - data.output_weight
        if total_input_weight > 0:
            loss_percentage = (weight_loss / total_input_weight) * 100
        else:
            loss_percentage = 0.0

        # Totals and Cost per KG
        total_production_cost = raw_material_cost + component_cost + data.production_expenses
        cost_per_kg = total_production_cost / data.output_weight if data.output_weight > 0 else 0.0

        # Update entry with calculated fields
        entry.input_weight = total_input_weight
        entry.weight_loss = weight_loss
        entry.loss_percentage = loss_percentage
        entry.raw_material_cost = raw_material_cost
        entry.component_cost = component_cost
        entry.total_production_cost = total_production_cost
        entry.cost_per_kg = cost_per_kg

        db.add(entry)

        # Update finished product stock (In) - global stock
        await TxServices.update_stock(
            db=db,
            product_id=data.finished_product_id,
            company_id=company_id,
            qty_change=data.output_weight,
            tx_type="In",
            ref_type="Production Output",
            ref_id=entry.id,
            reason="Finished goods yield."
        )

        # Update finished product purchase price to reflect the new cost per kg
        fg_product.purchase_price = cost_per_kg
        db.add(fg_product)

        await db.commit()

        # Re-fetch
        q_res = await db.execute(
            select(ProductionEntry)
            .filter(ProductionEntry.id == entry.id)
            .options(
                selectinload(ProductionEntry.finished_product),
                selectinload(ProductionEntry.consumed_items).selectinload(ProductionConsumedItem.product)
            )
        )
        o = q_res.scalar_one()
        o.finished_product_name = o.finished_product.name
        o.finished_product_sku = o.finished_product.sku
        for item in o.consumed_items:
            item.product_name = item.product.name
            item.sku = item.product.sku
            item.uom = item.product.uom
        return o

    @staticmethod
    async def list_productions(db: AsyncSession, company_id: Optional[UUID] = None) -> List[ProductionEntry]:
        stmt = (
            select(ProductionEntry)
            .options(
                selectinload(ProductionEntry.finished_product),
                selectinload(ProductionEntry.consumed_items).selectinload(ProductionConsumedItem.product)
            )
            .order_by(ProductionEntry.date.desc())
        )
        if company_id:
            stmt = stmt.filter(ProductionEntry.company_id == company_id)
        query = await db.execute(stmt)
        results = list(query.scalars().all())
        for r in results:
            r.finished_product_name = r.finished_product.name
            r.finished_product_sku = r.finished_product.sku
            for item in r.consumed_items:
                item.product_name = item.product.name
                item.sku = item.product.sku
                item.uom = item.product.uom
        return results

    # ==========================================
    # DIRECT SALES
    # ==========================================
    @staticmethod
    async def create_direct_sale(db: AsyncSession, data: DirectSaleCreate) -> DirectSale:
        # Validate product is a Raw Material
        q_p = await db.execute(select(Product).filter(Product.id == data.product_id))
        product = q_p.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        if product.product_type != "RAW":
            raise HTTPException(status_code=400, detail="Only RAW material scrap products can be directly sold here.")

        # Resolve company_id if zero or invalid
        company_id = data.company_id
        q_co_exists = await db.execute(select(Company).filter(Company.id == company_id))
        if not q_co_exists.scalar_one_or_none() or str(company_id) == "00000000-0000-0000-0000-000000000000":
            q_any_co = await db.execute(select(Company).limit(1))
            any_company = q_any_co.scalar_one_or_none()
            if any_company:
                company_id = any_company.id
            else:
                raise HTTPException(status_code=400, detail="No active company found in the system.")

        purchase_cost = product.purchase_price
        total_amount = data.qty * data.rate
        profit = total_amount - (data.qty * purchase_cost)

        sale = DirectSale(
            customer_id=data.customer_id,
            product_id=data.product_id,
            company_id=company_id,
            qty=data.qty,
            rate=data.rate,
            total_amount=total_amount,
            purchase_cost=purchase_cost,
            profit=profit,
            date=data.date or datetime.utcnow()
        )
        db.add(sale)
        await db.flush()

        # Update inventory stock levels (Out) - global stock
        await TxServices.update_stock(
            db=db,
            product_id=data.product_id,
            company_id=company_id,
            qty_change=-data.qty,
            tx_type="Out",
            ref_type="Direct Scrap Sale",
            ref_id=sale.id,
            reason=f"Direct raw scrap sale to customer. Customer ID: {data.customer_id}"
        )

        await db.commit()

        # Re-fetch
        q_res = await db.execute(
            select(DirectSale)
            .filter(DirectSale.id == sale.id)
            .options(
                selectinload(DirectSale.customer),
                selectinload(DirectSale.product)
            )
        )
        o = q_res.scalar_one()
        o.customer_name = o.customer.name
        o.product_name = o.product.name
        o.sku = o.product.sku
        o.uom = o.product.uom
        return o

    @staticmethod
    async def list_direct_sales(db: AsyncSession, company_id: Optional[UUID] = None) -> List[DirectSale]:
        stmt = (
            select(DirectSale)
            .options(
                selectinload(DirectSale.customer),
                selectinload(DirectSale.product)
            )
            .order_by(DirectSale.date.desc())
        )
        if company_id:
            stmt = stmt.filter(DirectSale.company_id == company_id)
        query = await db.execute(stmt)
        results = list(query.scalars().all())
        for r in results:
            r.customer_name = r.customer.name
            r.product_name = r.product.name
            r.sku = r.product.sku
            r.uom = r.product.uom
        return results

    # ==========================================
    # DASHBOARD KPI SUMMARIES
    # ==========================================
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, company_id: Optional[UUID] = None) -> dict:
        # 1. Fetch current stock products and filter by type (global inventory)
        q_stock = await db.execute(
            select(CurrentStock)
            .options(selectinload(CurrentStock.product))
        )
        stocks = list(q_stock.scalars().all())

        raw_stock = sum([s.qty for s in stocks if s.product.product_type == "RAW"])
        finished_stock = sum([s.qty for s in stocks if s.product.product_type == "FINISHED"])

        # 2. Production stats (aggregate input, output, loss, costs)
        q_production = await db.execute(select(ProductionEntry))
        productions = list(q_production.scalars().all())
        if company_id:
            productions = [p for p in productions if p.company_id == company_id]

        total_produced = sum([p.output_weight for p in productions])
        total_loss = sum([p.weight_loss for p in productions])
        total_cost = sum([p.total_production_cost for p in productions])
        avg_cost_per_kg = (total_cost / total_produced) if total_produced > 0 else 0.0

        # 3. Sales statistics (Direct sales of scrap + normal sales of finished goods from invoices)
        # Direct Sales
        q_direct_sales = await db.execute(select(DirectSale))
        direct_sales = list(q_direct_sales.scalars().all())
        if company_id:
            direct_sales = [ds for ds in direct_sales if ds.company_id == company_id]

        direct_sales_sum = sum([ds.total_amount for ds in direct_sales])
        direct_sales_profit = sum([ds.profit for ds in direct_sales])

        # Normal Finished Goods Sales (from invoices)
        from app.models.sales import Invoice, InvoiceItem
        q_invoices = await db.execute(
            select(Invoice)
            .options(selectinload(Invoice.items).selectinload(InvoiceItem.product))
            .filter(Invoice.status != "Cancelled")
        )
        invoices = list(q_invoices.scalars().all())
        if company_id:
            invoices = [inv for inv in invoices if inv.company_id == company_id]

        finished_sales_sum = sum([inv.subtotal for inv in invoices])
        # Profit on finished sales is calculated as subtotal - (qty * finished_product.purchase_price)
        finished_sales_profit = 0.0
        for inv in invoices:
            for item in inv.items:
                if item.product and item.product.product_type == "FINISHED":
                    cost = item.qty * item.product.purchase_price
                    finished_sales_profit += (item.amount - cost)

        total_sales = direct_sales_sum + finished_sales_sum
        gross_profit = direct_sales_profit + finished_sales_profit

        return {
            "current_raw_material_stock": raw_stock,
            "current_finished_goods_stock": finished_stock,
            "total_production_completed": total_produced,
            "total_production_loss": total_loss,
            "loss_percentage": (total_loss / (total_produced + total_loss) * 100) if (total_produced + total_loss) > 0 else 0.0,
            "total_production_cost": total_cost,
            "average_cost_per_kg": avg_cost_per_kg,
            "total_sales": total_sales,
            "gross_profit": gross_profit
        }

    # ==========================================
    # MANUFACTURING FLOW PROCESSES
    # ==========================================
    @staticmethod
    async def get_manufacturing(db: AsyncSession, process_id: UUID) -> ManufacturingProcess:
        stmt = (
            select(ManufacturingProcess)
            .filter(ManufacturingProcess.id == process_id)
            .options(
                selectinload(ManufacturingProcess.product_to_recycle),
                selectinload(ManufacturingProcess.output_product),
                selectinload(ManufacturingProcess.items).selectinload(ManufacturingProcessItem.product)
            )
        )
        query = await db.execute(stmt)
        process = query.scalar_one_or_none()
        if not process:
             raise HTTPException(status_code=404, detail="Manufacturing process not found.")
        
        process.product_to_recycle_name = process.product_to_recycle.name
        if process.output_product:
             process.output_product_name = process.output_product.name
        else:
             process.output_product_name = None
             
        for item in process.items:
             item.product_name = item.product.name
             item.sku = item.product.sku
             item.uom = item.product.uom
             item.purchase_price = item.product.purchase_price
             
        return process

    @staticmethod
    async def create_manufacturing(db: AsyncSession, data: ManufacturingProcessCreate) -> ManufacturingProcess:
        # Auto generate manufacturing number: MFG-YYYYMMDD-XXXX
        today_str = datetime.utcnow().strftime("%Y%m%d")
        stmt = select(ManufacturingProcess).filter(ManufacturingProcess.manufacturing_no.like(f"MFG-{today_str}-%"))
        res = await db.execute(stmt)
        today_count = len(res.scalars().all())
        manufacturing_no = f"MFG-{today_str}-{(today_count + 1):04d}"
         
        # Resolve company_id if zero or invalid
        company_id = data.company_id
        q_co_exists = await db.execute(select(Company).filter(Company.id == company_id))
        if not q_co_exists.scalar_one_or_none() or str(company_id) == "00000000-0000-0000-0000-000000000000":
             q_any_co = await db.execute(select(Company).limit(1))
             any_company = q_any_co.scalar_one_or_none()
             if any_company:
                 company_id = any_company.id
             else:
                 raise HTTPException(status_code=400, detail="No active company found in the system.")
         
        process = ManufacturingProcess(
             manufacturing_no=manufacturing_no,
             date=data.date or datetime.utcnow(),
             product_to_recycle_id=data.product_to_recycle_id,
             status="In Process",
             process_expenses=data.process_expenses,
             company_id=company_id
        )
        db.add(process)
        await db.flush()
         
        for item in data.items:
             process_item = ManufacturingProcessItem(
                 process_id=process.id,
                 product_id=item.product_id,
                 bom_qty=item.bom_qty,
                 actual_qty_used=item.actual_qty_used
             )
             db.add(process_item)
             
        await db.commit()
        return await RecyclingServices.get_manufacturing(db, process.id)

    @staticmethod
    async def list_manufacturings(db: AsyncSession, company_id: Optional[UUID] = None) -> List[ManufacturingProcess]:
        stmt = (
            select(ManufacturingProcess)
            .options(
                selectinload(ManufacturingProcess.product_to_recycle),
                selectinload(ManufacturingProcess.output_product),
                selectinload(ManufacturingProcess.items).selectinload(ManufacturingProcessItem.product)
            )
            .order_by(ManufacturingProcess.date.desc())
        )
        if company_id:
             stmt = stmt.filter(ManufacturingProcess.company_id == company_id)
        query = await db.execute(stmt)
        results = list(query.scalars().all())
        for r in results:
             r.product_to_recycle_name = r.product_to_recycle.name
             if r.output_product:
                 r.output_product_name = r.output_product.name
             else:
                 r.output_product_name = None
                 
             for item in r.items:
                 item.product_name = item.product.name
                 item.sku = item.product.sku
                 item.uom = item.product.uom
                 item.purchase_price = item.product.purchase_price
        return results

    @staticmethod
    async def update_manufacturing(
        db: AsyncSession, process_id: UUID, data: ManufacturingProcessUpdate
    ) -> ManufacturingProcess:
        q = await db.execute(select(ManufacturingProcess).filter(ManufacturingProcess.id == process_id))
        process = q.scalar_one_or_none()
        if not process:
             raise HTTPException(status_code=404, detail="Manufacturing process not found.")
          
        if process.status == "Completed":
             raise HTTPException(status_code=400, detail="Cannot edit a completed manufacturing process.")
              
        process.process_expenses = data.process_expenses
        db.add(process)
         
        # Update actual_qty_used for items
        for item_update in data.items:
             q_item = await db.execute(
                 select(ManufacturingProcessItem)
                 .filter(
                     ManufacturingProcessItem.process_id == process_id,
                     ManufacturingProcessItem.product_id == item_update.product_id
                 )
             )
             item = q_item.scalar_one_or_none()
             if item:
                 item.actual_qty_used = item_update.actual_qty_used
                 db.add(item)
                  
        await db.commit()
        return await RecyclingServices.get_manufacturing(db, process_id)

    @staticmethod
    async def delete_manufacturing(db: AsyncSession, process_id: UUID) -> None:
        q = await db.execute(select(ManufacturingProcess).filter(ManufacturingProcess.id == process_id))
        process = q.scalar_one_or_none()
        if not process:
             raise HTTPException(status_code=404, detail="Manufacturing process not found.")
          
        if process.status == "Completed":
             raise HTTPException(status_code=400, detail="Cannot delete a completed manufacturing process.")
              
        await db.delete(process)
        await db.commit()

    @staticmethod
    async def finish_manufacturing(
        db: AsyncSession, process_id: UUID, data: ManufacturingProcessFinish
    ) -> ManufacturingProcess:
        process = await RecyclingServices.get_manufacturing(db, process_id)
        if process.status == "Completed":
             raise HTTPException(status_code=400, detail="Manufacturing process is already completed.")
              
        q_prod = await db.execute(select(Product).filter(Product.id == data.output_product_id))
        output_product = q_prod.scalar_one_or_none()
        if not output_product:
             raise HTTPException(status_code=404, detail="Output product not found.")
              
        process.status = "Completed"
        process.output_product_id = data.output_product_id
        process.output_weight = data.output_weight
        process.remarks = data.remarks
        db.add(process)
         
        # 1. Update inventory stock for Output Product (Increase by Output Weight) - global stock
        await TxServices.update_stock(
             db=db,
             product_id=data.output_product_id,
             company_id=process.company_id,
             qty_change=data.output_weight,
             tx_type="In",
             ref_type="Manufacturing Output",
             ref_id=process.id,
             reason=f"Recycling manufacturing completion yield. Ref No: {process.manufacturing_no}"
        )
         
        # 2. Deduct inventory stock for consumed raw materials (Decrease by actual_qty_used) - global stock
        for item in process.items:
             if item.actual_qty_used > 0:
                  await TxServices.update_stock(
                      db=db,
                      product_id=item.product_id,
                      company_id=process.company_id,
                      qty_change=-item.actual_qty_used,
                      tx_type="Out",
                      ref_type="Manufacturing Consumption",
                      ref_id=process.id,
                      reason=f"Consumed in recycling run. Ref No: {process.manufacturing_no}"
                  )
                  
        await db.commit()
        return await RecyclingServices.get_manufacturing(db, process_id)

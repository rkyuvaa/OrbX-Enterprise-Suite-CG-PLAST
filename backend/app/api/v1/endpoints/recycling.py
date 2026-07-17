from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import deps
from app.models.auth import User
from app.schemas.recycling import (
    RawMaterialReceiptCreate, RawMaterialReceiptOut,
    RecipeCreate, RecipeOut,
    ProductionEntryCreate, ProductionEntryOut,
    DirectSaleCreate, DirectSaleOut,
    ManufacturingProcessCreate, ManufacturingProcessUpdate,
    ManufacturingProcessOut, ManufacturingProcessFinish
)
from app.services.recycling_services import RecyclingServices

router = APIRouter()


# ==========================================
# RAW MATERIAL RECEIPTS
# ==========================================
@router.post("/receipts", response_model=RawMaterialReceiptOut, status_code=status.HTTP_201_CREATED)
async def create_receipt(
    data: RawMaterialReceiptCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Log a raw plastic scrap material receipt intake."""
    return await RecyclingServices.create_receipt(db, data)


@router.get("/receipts", response_model=List[RawMaterialReceiptOut])
async def list_receipts(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """List raw material scrap receipts."""
    return await RecyclingServices.list_receipts(db, company_id)


# ==========================================
# RECIPES (BOM)
# ==========================================
@router.post("/recipes", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Predefine a Bill of Materials (BOM) recipe template."""
    return await RecyclingServices.create_recipe(db, data)


@router.get("/recipes", response_model=List[RecipeOut])
async def list_recipes(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """List predefined recipe templates."""
    return await RecyclingServices.list_recipes(db)


@router.put("/recipes/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update a Bill of Materials (BOM) recipe template."""
    return await RecyclingServices.update_recipe(db, recipe_id, data)


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Remove a recipe template."""
    await RecyclingServices.delete_recipe(db, recipe_id)


# ==========================================
# MANUFACTURING (PRODUCTION RUNS)
# ==========================================
@router.post("/production", response_model=ProductionEntryOut, status_code=status.HTTP_201_CREATED)
async def create_production(
    data: ProductionEntryCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Record a finished production run, calculate costing, yields and adjust stocks."""
    return await RecyclingServices.create_production(db, data)


@router.get("/production", response_model=List[ProductionEntryOut])
async def list_productions(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """List production logs."""
    return await RecyclingServices.list_productions(db, company_id)


# ==========================================
# DIRECT SALES
# ==========================================
@router.post("/direct-sales", response_model=DirectSaleOut, status_code=status.HTTP_201_CREATED)
async def create_direct_sale(
    data: DirectSaleCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Deduct inventory and sell raw scrap scrap directly to a customer."""
    return await RecyclingServices.create_direct_sale(db, data)


@router.get("/direct-sales", response_model=List[DirectSaleOut])
async def list_direct_sales(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """List direct sales entries."""
    return await RecyclingServices.list_direct_sales(db, company_id)


# ==========================================
# DASHBOARD KPI & ANALYTICS
# ==========================================
@router.get("/dashboard", response_model=dict)
async def get_dashboard_stats(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get recycling analytics KPIs."""
    return await RecyclingServices.get_dashboard_stats(db, company_id)


# ==========================================
# MANUFACTURING PROCESS FLOW
# ==========================================
@router.post("/manufacturing", response_model=ManufacturingProcessOut, status_code=status.HTTP_201_CREATED)
async def create_manufacturing(
    data: ManufacturingProcessCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Start a new manufacturing process run (status moves to In Process)."""
    return await RecyclingServices.create_manufacturing(db, data)


@router.get("/manufacturing", response_model=List[ManufacturingProcessOut])
async def list_manufacturings(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """List manufacturing process runs."""
    return await RecyclingServices.list_manufacturings(db, company_id)


@router.get("/manufacturing/{process_id}", response_model=ManufacturingProcessOut)
async def get_manufacturing(
    process_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Retrieve details of a manufacturing process run."""
    return await RecyclingServices.get_manufacturing(db, process_id)


@router.put("/manufacturing/{process_id}", response_model=ManufacturingProcessOut)
async def update_manufacturing(
    process_id: UUID,
    data: ManufacturingProcessUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update actual quantities used and process expenses for an active manufacturing process."""
    return await RecyclingServices.update_manufacturing(db, process_id, data)


@router.delete("/manufacturing/{process_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manufacturing(
    process_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Delete a manufacturing process run."""
    await RecyclingServices.delete_manufacturing(db, process_id)


@router.post("/manufacturing/{process_id}/finish", response_model=ManufacturingProcessOut)
async def finish_manufacturing(
    process_id: UUID,
    data: ManufacturingProcessFinish,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Finish a manufacturing process, update stock and mark status as Completed."""
    return await RecyclingServices.finish_manufacturing(db, process_id, data)

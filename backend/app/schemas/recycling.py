from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


# Raw Material Receipt Schemas
class RawMaterialReceiptCreate(BaseModel):
    supplier_id: UUID
    product_id: UUID
    company_id: UUID
    qty: float
    rate: float
    date: Optional[datetime] = None


class RawMaterialReceiptOut(BaseModel):
    id: UUID
    supplier_id: UUID
    product_id: UUID
    company_id: UUID
    qty: float
    rate: float
    total_cost: float
    date: datetime
    supplier_name: Optional[str] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None

    class Config:
        from_attributes = True


# Recipe (BOM) Schemas
class RecipeItemCreate(BaseModel):
    product_id: UUID
    qty: float


class RecipeCreate(BaseModel):
    finished_product_id: UUID
    name: str
    expected_loss_percentage: float = 0.0
    items: List[RecipeItemCreate]


class RecipeItemOut(BaseModel):
    id: UUID
    recipe_id: UUID
    product_id: UUID
    qty: float
    product_name: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None

    class Config:
        from_attributes = True


class RecipeOut(BaseModel):
    id: UUID
    finished_product_id: UUID
    name: str
    expected_loss_percentage: float
    finished_product_name: Optional[str] = None
    finished_product_sku: Optional[str] = None
    items: List[RecipeItemOut] = []

    class Config:
        from_attributes = True


# Production Entry Schemas
class ProductionConsumedItemCreate(BaseModel):
    product_id: UUID
    qty: float


class ProductionEntryCreate(BaseModel):
    finished_product_id: UUID
    recipe_id: Optional[UUID] = None
    company_id: UUID
    output_weight: float
    production_expenses: float = 0.0
    consumed_items: List[ProductionConsumedItemCreate]
    date: Optional[datetime] = None


class ProductionConsumedItemOut(BaseModel):
    id: UUID
    product_id: UUID
    qty: float
    unit_cost: float
    total_cost: float
    product_name: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None

    class Config:
        from_attributes = True


class ProductionEntryOut(BaseModel):
    id: UUID
    finished_product_id: UUID
    recipe_id: Optional[UUID] = None
    company_id: UUID
    input_weight: float
    output_weight: float
    weight_loss: float
    loss_percentage: float
    production_expenses: float
    raw_material_cost: float
    component_cost: float
    total_production_cost: float
    cost_per_kg: float
    date: datetime
    finished_product_name: Optional[str] = None
    finished_product_sku: Optional[str] = None
    consumed_items: List[ProductionConsumedItemOut] = []

    class Config:
        from_attributes = True


# Direct Sale Schemas
class DirectSaleCreate(BaseModel):
    customer_id: UUID
    product_id: UUID
    company_id: UUID
    qty: float
    rate: float
    date: Optional[datetime] = None


class DirectSaleOut(BaseModel):
    id: UUID
    customer_id: UUID
    product_id: UUID
    company_id: UUID
    qty: float
    rate: float
    total_amount: float
    purchase_cost: float
    profit: float
    date: datetime
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None

    class Config:
        from_attributes = True


# Manufacturing Process Schemas
class ManufacturingProcessItemCreate(BaseModel):
    product_id: UUID
    bom_qty: float
    actual_qty_used: float


class ManufacturingProcessCreate(BaseModel):
    product_to_recycle_id: UUID
    company_id: UUID
    date: Optional[datetime] = None
    process_expenses: float = 0.0
    items: List[ManufacturingProcessItemCreate]


class ManufacturingProcessItemUpdate(BaseModel):
    product_id: UUID
    actual_qty_used: float


class ManufacturingProcessUpdate(BaseModel):
    process_expenses: float
    items: List[ManufacturingProcessItemUpdate]


class ManufacturingProcessItemOut(BaseModel):
    id: UUID
    product_id: UUID
    bom_qty: float
    actual_qty_used: float
    product_name: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None
    purchase_price: Optional[float] = None

    class Config:
        from_attributes = True


class ManufacturingProcessOut(BaseModel):
    id: UUID
    manufacturing_no: str
    date: datetime
    product_to_recycle_id: UUID
    product_to_recycle_name: Optional[str] = None
    status: str
    process_expenses: float
    output_product_id: Optional[UUID] = None
    output_product_name: Optional[str] = None
    output_weight: Optional[float] = None
    remarks: Optional[str] = None
    company_id: UUID
    items: List[ManufacturingProcessItemOut] = []

    class Config:
        from_attributes = True


class ManufacturingProcessFinish(BaseModel):
    output_product_id: UUID
    output_weight: float
    remarks: Optional[str] = None


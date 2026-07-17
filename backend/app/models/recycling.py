from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy import ForeignKey, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class RawMaterialReceipt(Base):
    __tablename__ = "raw_material_receipts"

    supplier_id: Mapped[UUID] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float, default=0.0) # Weight received in kg
    rate: Mapped[float] = mapped_column(Float, default=0.0) # Cost per kg
    total_cost: Mapped[float] = mapped_column(Float, default=0.0) # qty * rate
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    supplier: Mapped["Supplier"] = relationship()
    product: Mapped["Product"] = relationship()
    company: Mapped["Company"] = relationship()


class Recipe(Base):
    __tablename__ = "recipes"

    finished_product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    expected_loss_percentage: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    finished_product: Mapped["Product"] = relationship()
    items: Mapped[List["RecipeItem"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")


class RecipeItem(Base):
    __tablename__ = "recipe_items"

    recipe_id: Mapped[UUID] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float, default=1.0) # Qty multiplier required

    # Relationships
    recipe: Mapped["Recipe"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


class ProductionEntry(Base):
    __tablename__ = "production_entries"

    finished_product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    recipe_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    
    input_weight: Mapped[float] = mapped_column(Float, default=0.0)
    output_weight: Mapped[float] = mapped_column(Float, default=0.0)
    weight_loss: Mapped[float] = mapped_column(Float, default=0.0)
    loss_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    
    production_expenses: Mapped[float] = mapped_column(Float, default=0.0)
    raw_material_cost: Mapped[float] = mapped_column(Float, default=0.0)
    component_cost: Mapped[float] = mapped_column(Float, default=0.0)
    total_production_cost: Mapped[float] = mapped_column(Float, default=0.0)
    cost_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    finished_product: Mapped["Product"] = relationship()
    recipe: Mapped[Optional["Recipe"]] = relationship()
    company: Mapped["Company"] = relationship()
    consumed_items: Mapped[List["ProductionConsumedItem"]] = relationship(back_populates="production_entry", cascade="all, delete-orphan")


class ProductionConsumedItem(Base):
    __tablename__ = "production_consumed_items"

    production_entry_id: Mapped[UUID] = mapped_column(ForeignKey("production_entries.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float, default=0.0)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    production_entry: Mapped["ProductionEntry"] = relationship(back_populates="consumed_items")
    product: Mapped["Product"] = relationship()


class DirectSale(Base):
    __tablename__ = "direct_sales"

    customer_id: Mapped[UUID] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float, default=0.0)
    rate: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    purchase_cost: Mapped[float] = mapped_column(Float, default=0.0)
    profit: Mapped[float] = mapped_column(Float, default=0.0)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    customer: Mapped["Customer"] = relationship()
    product: Mapped["Product"] = relationship()
    company: Mapped["Company"] = relationship()


class ManufacturingProcess(Base):
    __tablename__ = "manufacturing_processes"

    manufacturing_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    product_to_recycle_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="In Process") # In Process, Completed
    process_expenses: Mapped[float] = mapped_column(Float, default=0.0)
    
    output_product_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=True)
    output_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)

    # Relationships
    product_to_recycle: Mapped["Product"] = relationship(foreign_keys=[product_to_recycle_id])
    output_product: Mapped[Optional["Product"]] = relationship(foreign_keys=[output_product_id])
    company: Mapped["Company"] = relationship()
    items: Mapped[List["ManufacturingProcessItem"]] = relationship(back_populates="process", cascade="all, delete-orphan")


class ManufacturingProcessItem(Base):
    __tablename__ = "manufacturing_process_items"

    process_id: Mapped[UUID] = mapped_column(ForeignKey("manufacturing_processes.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    bom_qty: Mapped[float] = mapped_column(Float, default=0.0)
    actual_qty_used: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    process: Mapped["ManufacturingProcess"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


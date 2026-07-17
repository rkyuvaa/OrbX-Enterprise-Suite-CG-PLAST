from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy import ForeignKey, String, Float, DateTime, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.business import Company


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float) # positive for In, negative for Out
    transaction_type: Mapped[str] = mapped_column(String(30)) # In, Out, Adjustment
    
    reference_type: Mapped[str] = mapped_column(String(50)) # GRN, Sales Invoice, Manual Stock In, Manual Stock Out, Adjustment
    reference_id: Mapped[UUID] = mapped_column(nullable=True, index=True) # ID of corresponding GRN, Invoice, etc.
    reason: Mapped[str] = mapped_column(String(255), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    product: Mapped["Product"] = relationship()
    company: Mapped["Company"] = relationship()


class CurrentStock(Base):
    __tablename__ = "current_stock"

    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    product: Mapped["Product"] = relationship()
    company: Mapped["Company"] = relationship()

    __table_args__ = (UniqueConstraint("product_id", "company_id"),)


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="RESTRICT"), index=True)
    customer_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True, index=True)
    challan_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(30), default="Draft") # Draft, Transferred, Cancelled
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Values & GST calculations
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, default=0.0)
    gst_breakup: Mapped[dict] = mapped_column(JSON, default=dict)

    # Relationships
    company: Mapped["Company"] = relationship(foreign_keys=[company_id])
    customer: Mapped[Optional["Customer"]] = relationship()
    items: Mapped[List["StockTransferItem"]] = relationship(back_populates="transfer", cascade="all, delete-orphan")



class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    transfer_id: Mapped[UUID] = mapped_column(ForeignKey("stock_transfers.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    qty: Mapped[float] = mapped_column(Float)
    
    rate: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_rate: Mapped[float] = mapped_column(Float, default=18.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    transfer: Mapped["StockTransfer"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()

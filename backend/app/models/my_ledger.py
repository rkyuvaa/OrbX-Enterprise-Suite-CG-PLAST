from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import ForeignKey, String, Float, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class MyLedgerAdjustment(Base):
    __tablename__ = "my_ledger_adjustments"

    party_type: Mapped[str] = mapped_column(String(30), index=True) # CUSTOMER, SUPPLIER
    party_id: Mapped[UUID] = mapped_column(index=True)
    tx_key: Mapped[str] = mapped_column(String(100), index=True)
    tx_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    additional_amount: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint('party_type', 'party_id', 'tx_key', name='uq_my_ledger_party_tx_key'),
    )

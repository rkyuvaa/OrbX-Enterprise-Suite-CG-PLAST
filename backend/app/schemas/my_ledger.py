from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class MyLedgerEntry(BaseModel):
    tx_key: str
    date: datetime
    tx_type: str
    reference_no: str
    debit: float
    credit: float
    additional_amount: float = 0.0
    running_balance: float
    notes: Optional[str] = None


class MyLedgerResponse(BaseModel):
    party_id: UUID
    party_name: str
    party_type: str
    total_debit: float
    total_credit: float
    total_additional_amount: float
    grand_total: float
    transactions: List[MyLedgerEntry] = []


class MyLedgerAdjustmentCreate(BaseModel):
    party_type: str # CUSTOMER or SUPPLIER
    party_id: UUID
    tx_key: str
    tx_type: Optional[str] = None
    reference_no: Optional[str] = None
    additional_amount: float = 0.0
    notes: Optional[str] = None
    company_id: Optional[UUID] = None


class MyLedgerAdjustmentOut(BaseModel):
    id: UUID
    party_type: str
    party_id: UUID
    tx_key: str
    tx_type: Optional[str] = None
    reference_no: Optional[str] = None
    additional_amount: float
    notes: Optional[str] = None
    company_id: Optional[UUID] = None

    class Config:
        from_attributes = True

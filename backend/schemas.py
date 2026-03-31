from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class FeeBase(BaseModel):
    student_id: int
    academic_year: str
    term: str
    amount_due: float
    due_date: date

class FeeCreate(FeeBase):
    pass

class FeePaymentBase(BaseModel):
    amount_paid: float
    payment_method: Optional[str] = None

class FeePaymentCreate(FeePaymentBase):
    pass

class FeePaymentResponse(FeePaymentBase):
    id: int
    fee_id: int
    payment_date: datetime
    recorded_by: int

    class Config:
        from_attributes = True

class FeeResponse(FeeBase):
    id: int
    is_paid: bool
    created_at: datetime
    payments: List[FeePaymentResponse] = []

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    receiver_id: int
    subject: Optional[str] = None
    body: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    sender_id: int
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True

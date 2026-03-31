from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Fee, FeePayment, UserRole, User, Student, Parent, ParentStudent, Notice, NoticeAudience
from auth import get_current_user, require_role
from schemas import FeeCreate, FeeResponse, FeePaymentCreate, FeePaymentResponse
from datetime import datetime

router = APIRouter(prefix="/fees", tags=["fees"])

@router.post("/", response_model=FeeResponse)
def create_fee(
    fee: FeeCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == fee.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    new_fee = Fee(
        student_id=fee.student_id,
        academic_year=fee.academic_year,
        term=fee.term,
        amount_due=fee.amount_due,
        due_date=fee.due_date
    )
    db.add(new_fee)
    db.commit()
    db.refresh(new_fee)
    return new_fee


@router.get("/student/{student_id}", response_model=List[FeeResponse])
def get_student_fees(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verification: Only Principal, Admin, or the specific Parent can view these
    if current_user.role == UserRole.PARENT: # type: ignore
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not authorized to view this student's fees")
    elif current_user.role not in [UserRole.SUPER_ADMIN, UserRole.PRINCIPAL]: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized")

    fees = db.query(Fee).filter(Fee.student_id == student_id).all()
    return fees


@router.get("/all/summary")
def get_all_fees_summary(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    fees = db.query(Fee).all()
    result = []
    for fee in fees:
        total_paid = sum(p.amount_paid for p in fee.payments)
        
        status = "PENDING"
        if fee.is_paid or total_paid >= fee.amount_due:
            status = "PAID"
        elif total_paid > 0:
            status = "PARTIAL"

        result.append({
            "fee_id": fee.id,
            "student_id": fee.student_id,
            "student_name": f"{fee.student.user.first_name} {fee.student.user.last_name}" if fee.student and fee.student.user else "Unknown",
            "student_number": fee.student.student_number if fee.student else "Unknown",
            "academic_year": fee.academic_year,
            "term": fee.term,
            "amount_due": fee.amount_due,
            "amount_paid": total_paid,
            "due_date": fee.due_date,
            "is_paid": fee.is_paid,
            "payment_status": status
        })
    return result

@router.get("/pending")
def get_pending_fees(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    fees = db.query(Fee).filter(Fee.is_paid == False).all()
    result = []
    for fee in fees:
        total_paid = sum(p.amount_paid for p in fee.payments)
        if total_paid >= fee.amount_due:
            continue
            
        status = "PARTIAL" if total_paid > 0 else "PENDING"
        result.append({
            "fee_id": fee.id,
            "student_id": fee.student_id,
            "student_name": f"{fee.student.user.first_name} {fee.student.user.last_name}" if (fee.student and fee.student.user) else "Unknown",
            "academic_year": fee.academic_year,
            "term": fee.term,
            "amount_due": fee.amount_due,
            "amount_paid": total_paid,
            "due_date": fee.due_date,
            "payment_status": status
        })
    return result

@router.get("/paid")
def get_paid_fees(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    fees = db.query(Fee).filter(Fee.is_paid == True).all()
    # Also include those where total_paid >= amount_due just in case is_paid wasn't flipped properly somehow
    unpaid_fees = db.query(Fee).filter(Fee.is_paid == False).all()
    
    all_paid_fees = list(fees)
    for fee in unpaid_fees:
        if sum(p.amount_paid for p in fee.payments) >= fee.amount_due:
            all_paid_fees.append(fee)
            
    result = []
    for fee in all_paid_fees:
        total_paid = sum(p.amount_paid for p in fee.payments)
        result.append({
            "fee_id": fee.id,
            "student_id": fee.student_id,
            "student_name": f"{fee.student.user.first_name} {fee.student.user.last_name}" if (fee.student and fee.student.user) else "Unknown",
            "academic_year": fee.academic_year,
            "term": fee.term,
            "amount_due": fee.amount_due,
            "amount_paid": total_paid,
            "due_date": fee.due_date,
            "payment_status": "PAID"
        })
    return result

@router.post("/{fee_id}/pay", response_model=FeePaymentResponse)
def record_payment(
    fee_id: int,
    payment: FeePaymentCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")

    new_payment = FeePayment(
        fee_id=fee_id,
        amount_paid=payment.amount_paid,
        payment_method=payment.payment_method,
        recorded_by=current_user.id
    )
    db.add(new_payment)
    
    # Check if fee is now fully paid
    total_paid = sum(p.amount_paid for p in fee.payments) + payment.amount_paid
    if total_paid >= fee.amount_due:
        fee.is_paid = True # type: ignore
    
    db.commit()
    db.refresh(new_payment)

    # Trigger a notification to the parent
    student = db.query(Student).filter(Student.id == fee.student_id).first()
    if student:
        for assoc in student.parent_associations: # parent_associations is list of ParentStudent
            parent_user_id = assoc.parent.user_id
            notice = Notice(
                created_by=current_user.id,
                title="Fee Payment Received",
                body=f"We have received a payment of {payment.amount_paid} for {student.user.first_name}'s {fee.term} fees.",
                audience=NoticeAudience.PARENTS, # Just marking audience, but normally this would target directly.
                # In current system Notice goes to all if audience=PARENTS. We might want to notify them directly or they just see it because they are parents.
                # The prompt asks for them to be notified. The notification is via the 'notices' router.
                # Actually, the quickest 'direct' way is utilizing direct messaging we're about to build, or saving a Notice specifically.
                # Let's save a direct message from the system/Principal to the parent.
            )
            # We will use the new Message system instead of general Notices to directly inform the parent
            from models import Message
            sys_msg = Message(
                sender_id=current_user.id,
                receiver_id=parent_user_id,
                subject="Fee Payment Confirmation",
                body=f"Dear Parent,\nWe have successfully received a payment of {payment.amount_paid} towards {student.user.first_name} {student.user.last_name}'s fees for {fee.term} ({fee.academic_year}).\nTotal paid so far: {total_paid}/{fee.amount_due}.\nThank you."
            )
            db.add(sys_msg)
        db.commit()

    return new_payment

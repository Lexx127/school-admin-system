from database import SessionLocal
from models import User, Student, Fee, FeePayment
from datetime import date, timedelta

def seed_fees():
    db = SessionLocal()
    
    # Get some students
    students = db.query(Student).limit(5).all()
    admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
    
    if not students or not admin:
        print("Not enough dummy students or admin user found in DB to seed fee data.")
        return
        
    print(f"Using Admin: {admin.email} to record payments.")
    
    # 1. Fully Paid Fee
    print(f"Creating PAID fee for Student ID: {students[0].id}")
    fee1 = Fee(student_id=students[0].id, academic_year="2026", term="Term 1", amount_due=1500.0, due_date=date.today() + timedelta(days=30), is_paid=True)
    db.add(fee1)
    db.commit()
    payment1 = FeePayment(fee_id=fee1.id, amount_paid=1500.0, payment_method="Bank Transfer", recorded_by=admin.id)
    db.add(payment1)
    
    # 2. Partially Paid Fee
    print(f"Creating PARTIAL fee for Student ID: {students[1].id}")
    fee2 = Fee(student_id=students[1].id, academic_year="2026", term="Term 1", amount_due=1200.0, due_date=date.today() + timedelta(days=30), is_paid=False)
    db.add(fee2)
    db.commit()
    payment2 = FeePayment(fee_id=fee2.id, amount_paid=500.0, payment_method="Cash", recorded_by=admin.id)
    db.add(payment2)
    
    # 3. Pending Fee
    print(f"Creating PENDING fee for Student ID: {students[2].id}")
    fee3 = Fee(student_id=students[2].id, academic_year="2026", term="Term 1", amount_due=1000.0, due_date=date.today() + timedelta(days=15), is_paid=False)
    db.add(fee3)
    
    db.commit()
    db.close()
    print("Successfully seeded distinct fee scenarios (Paid, Partial, Pending).")

if __name__ == "__main__":
    seed_fees()

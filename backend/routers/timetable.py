from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import TimetableSlot, ClassSubject, Class, Subject, Staff, User, UserRole, Student, StudentSubjectEnrolment
from auth import require_role
from pydantic import BaseModel
from typing import List, Optional
from datetime import time

router = APIRouter(prefix="/timetable", tags=["timetable"])

class TimetableSlotCreate(BaseModel):
    class_subject_id: int
    cycle_day: int
    period_number: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None

@router.get("/all")
def get_all_slots(db: Session = Depends(get_db)):
    slots = db.query(TimetableSlot).all()
    return [
        {
            "id": s.id,
            "class_subject_id": s.class_subject_id,
            "class_name": s.class_subject.homeroom_class.name,
            "subject_name": s.class_subject.subject.name,
            "teacher_name": f"{s.class_subject.teacher.user.first_name} {s.class_subject.teacher.user.last_name}",
            "cycle_day": s.cycle_day,
            "period_number": s.period_number,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None
        }
        for s in slots
    ]

@router.post("/add")
def add_timetable_slot(request: TimetableSlotCreate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    # Get the class_subject
    cs = db.query(ClassSubject).filter(ClassSubject.id == request.class_subject_id).first()
    if not cs:
        raise HTTPException(status_code=404, detail="Class-Subject assignment not found")

    # Conflict Check: Class
    existing_class_slot = db.query(TimetableSlot).join(ClassSubject).filter(
        ClassSubject.class_id == cs.class_id,
        TimetableSlot.cycle_day == request.cycle_day,
        TimetableSlot.period_number == request.period_number
    ).first()
    if existing_class_slot:
        raise HTTPException(
            status_code=400, 
            detail=f"Class {cs.homeroom_class.name} already has a lesson ({existing_class_slot.class_subject.subject.name}) at Day {request.cycle_day} Period {request.period_number}"
        )

    # Conflict Check: Teacher
    existing_teacher_slot = db.query(TimetableSlot).join(ClassSubject).filter(
        ClassSubject.teacher_id == cs.teacher_id,
        TimetableSlot.cycle_day == request.cycle_day,
        TimetableSlot.period_number == request.period_number
    ).first()
    if existing_teacher_slot:
        raise HTTPException(
            status_code=400, 
            detail=f"Teacher {cs.teacher.user.first_name} {cs.teacher.user.last_name} is already teaching {existing_teacher_slot.class_subject.homeroom_class.name} at Day {request.cycle_day} Period {request.period_number}"
        )

    # Parse times if provided
    st = None
    et = None
    if request.start_time:
        st = time.fromisoformat(request.start_time)
    if request.end_time:
        et = time.fromisoformat(request.end_time)

    new_slot = TimetableSlot(
        class_subject_id=request.class_subject_id,
        cycle_day=request.cycle_day,
        period_number=request.period_number,
        start_time=st,
        end_time=et
    )
    db.add(new_slot)
    db.commit()
    return {"message": "Timetable slot added successfully"}

@router.delete("/{slot_id}")
def delete_timetable_slot(slot_id: int, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"message": "Slot removed"}

@router.get("/student/me")
def get_my_timetable(current_user: User = Depends(require_role(UserRole.STUDENT)), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
        
    # Get active enrolments
    enrolments = db.query(StudentSubjectEnrolment).filter(
        StudentSubjectEnrolment.student_id == student.id,
        StudentSubjectEnrolment.end_date == None
    ).all()
    
    cs_ids = [e.class_subject_id for e in enrolments]
    
    slots = db.query(TimetableSlot).filter(TimetableSlot.class_subject_id.in_(cs_ids)).all()
    
    return [
        {
            "id": s.id,
            "subject_name": s.class_subject.subject.name,
            "teacher_name": f"{s.class_subject.teacher.user.first_name} {s.class_subject.teacher.user.last_name}",
            "cycle_day": s.cycle_day,
            "period_number": s.period_number,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None
        }
        for s in slots
    ]


@router.get("/student/year-view")
def get_student_year_view(current_user: User = Depends(require_role(UserRole.STUDENT)), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or not student.homeroom_class:
        raise HTTPException(status_code=404, detail="Student class record not found")

    grade_level = student.homeroom_class.grade_level
    class_ids = [
        c.id for c in db.query(Class).filter(Class.grade_level == grade_level).all()
    ]
    if not class_ids:
        return []

    enrolled_cs_ids = {
        e.class_subject_id for e in db.query(StudentSubjectEnrolment).filter(
            StudentSubjectEnrolment.student_id == student.id,
            StudentSubjectEnrolment.end_date == None  # noqa: E711
        ).all()
    }

    slots = db.query(TimetableSlot).join(ClassSubject).filter(
        ClassSubject.class_id.in_(class_ids)
    ).all()

    return [
        {
            "id": s.id,
            "class_name": s.class_subject.homeroom_class.name,
            "subject_name": s.class_subject.subject.name,
            "teacher_name": f"{s.class_subject.teacher.user.first_name} {s.class_subject.teacher.user.last_name}",
            "cycle_day": s.cycle_day,
            "period_number": s.period_number,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "is_enrolled": s.class_subject_id in enrolled_cs_ids,
        }
        for s in slots
    ]

@router.get("/teacher/me")
def get_teacher_timetable(current_user: User = Depends(require_role(UserRole.TEACHER)), db: Session = Depends(get_db)):
    from models import Staff
    
    teacher = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher record not found")
        
    slots = db.query(TimetableSlot).join(ClassSubject).filter(
        ClassSubject.teacher_id == teacher.id
    ).all()
    
    return [
        {
            "id": s.id,
            "class_name": s.class_subject.homeroom_class.name,
            "subject_name": s.class_subject.subject.name,
            "cycle_day": s.cycle_day,
            "period_number": s.period_number,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None
        }
        for s in slots
    ]

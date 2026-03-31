from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Student, ClassSubject, StudentSubjectEnrolment, UserRole
from auth import require_role
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/enrolments", tags=["enrolments"])

class EnrolCreate(BaseModel):
    student_id: int
    class_subject_id: int
    academic_year: str = "2026"

class EnrolEnd(BaseModel):
    end_date: date

@router.post("/")
def enrol_student(request: EnrolCreate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    existing = db.query(StudentSubjectEnrolment).filter(
        StudentSubjectEnrolment.student_id == request.student_id,
        StudentSubjectEnrolment.class_subject_id == request.class_subject_id,
        StudentSubjectEnrolment.end_date == None
    ).first()
    if existing:
        raise HTTPException(400, "Student is already enrolled in this subject")

    enrolment = StudentSubjectEnrolment(
        student_id=request.student_id,
        class_subject_id=request.class_subject_id,
        academic_year=request.academic_year,
        enrolled_date=date.today()
    )
    db.add(enrolment)
    db.commit()
    return {"message": "Student enrolled successfully", "id": enrolment.id}

@router.delete("/{enrolment_id}")
def unenrol_student(enrolment_id: int, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    enrolment = db.query(StudentSubjectEnrolment).filter(StudentSubjectEnrolment.id == enrolment_id).first()
    if not enrolment:
        raise HTTPException(404, "Enrolment not found")
    enrolment.end_date = date.today()
    db.commit()
    return {"message": "Student unenrolled (end date set). Grade history preserved."}

@router.get("/student/{student_id}")
def get_student_enrolments(student_id: int, db: Session = Depends(get_db)):
    enrolments = db.query(StudentSubjectEnrolment).filter(
        StudentSubjectEnrolment.student_id == student_id,
        StudentSubjectEnrolment.end_date == None
    ).all()
    return [
        {
            "id": e.id,
            "class_subject_id": e.class_subject_id,
            "subject_name": e.class_subject.subject.name,
            "teacher_name": f"{e.class_subject.teacher.user.first_name} {e.class_subject.teacher.user.last_name}",
            "class_name": e.class_subject.homeroom_class.name,
            "academic_year": e.academic_year,
            "enrolled_date": e.enrolled_date.isoformat()
        }
        for e in enrolments
    ]

@router.get("/class-subject/{class_subject_id}")
def get_class_subject_enrolments(class_subject_id: int, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)), db: Session = Depends(get_db)):
    enrolments = db.query(StudentSubjectEnrolment).filter(
        StudentSubjectEnrolment.class_subject_id == class_subject_id,
        StudentSubjectEnrolment.end_date == None
    ).all()
    return [
        {
            "id": e.id,
            "student_id": e.student_id,
            "student_name": f"{e.student.user.first_name} {e.student.user.last_name}",
            "student_number": e.student.student_number,
            "enrolled_date": e.enrolled_date.isoformat()
        }
        for e in enrolments
    ]

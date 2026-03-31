from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User, Class, Subject, ClassSubject, Staff, UserRole
from auth import get_current_user, require_role
from pydantic import BaseModel
from typing import List, Optional
import csv
import io

router = APIRouter(prefix="/classes", tags=["classes"])

class ClassSubjectCreate(BaseModel):
    subject_id: int
    teacher_id: int
    academic_year: Optional[str] = "2026"

class HomeroomAssign(BaseModel):
    teacher_id: int

@router.get("/{class_id}/subjects")
def get_class_subjects(class_id: int, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    class_subjects = db.query(ClassSubject).filter(ClassSubject.class_id == class_id).all()
    return [
        {
            "id": cs.id,
            "subject_id": cs.subject_id,
            "subject_name": cs.subject.name,
            "teacher_id": cs.teacher.user_id,
            "teacher_name": f"{cs.teacher.user.first_name} {cs.teacher.user.last_name}"
        }
        for cs in class_subjects
    ]

@router.post("/{class_id}/subjects")
def assign_subject_to_class(class_id: int, request: ClassSubjectCreate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.user_id == request.teacher_id).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Teacher not found")

    existing = db.query(ClassSubject).filter(ClassSubject.class_id == class_id, ClassSubject.subject_id == request.subject_id).first()
    if existing:
        existing.teacher_id = staff.id
        db.commit()
        return {"message": "Subject assignment updated"}
    
    new_cs = ClassSubject(
        class_id=class_id,
        subject_id=request.subject_id,
        teacher_id=staff.id,
        academic_year=request.academic_year
    )
    db.add(new_cs)
    db.commit()
    return {"message": "Subject assigned successfully"}

@router.delete("/subjects/{class_subject_id}")
def remove_subject_assignment(class_subject_id: int, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    cs = db.query(ClassSubject).filter(ClassSubject.id == class_subject_id).first()
    if not cs:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(cs)
    db.commit()
    return {"message": "Assignment removed"}

@router.put("/{class_id}/homeroom")
def assign_homeroom(class_id: int, request: HomeroomAssign, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    staff = db.query(Staff).filter(Staff.user_id == request.teacher_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    cls.homeroom_teacher_id = staff.id
    db.commit()
    return {"message": "Homeroom teacher assigned"}

@router.post("/bulk-assign-subjects")
def bulk_assign_subjects(file: UploadFile = File(...), current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    
    count = 0
    for row in reader:
        class_id = int(row["class_id"])
        subject_id = int(row["subject_id"])
        user_id = int(row["teacher_id"])
        
        staff = db.query(Staff).filter(Staff.user_id == user_id).first()
        if not staff: continue

        existing = db.query(ClassSubject).filter(ClassSubject.class_id == class_id, ClassSubject.subject_id == subject_id).first()
        if existing:
            existing.teacher_id = staff.id
        else:
            db.add(ClassSubject(class_id=class_id, subject_id=subject_id, teacher_id=staff.id, academic_year="2026"))
        count += 1
    
    db.commit()
    return {"message": f"Successfully processed {count} assignments"}

@router.get("/all-subjects")
def get_all_subjects(current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]

@router.get("/all-assignments")
def get_all_assignments(current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    assignments = db.query(ClassSubject).all()
    return [
        {
            "class_subject_id": cs.id,
            "class_id": cs.class_id,
            "class_name": cs.homeroom_class.name,
            "subject_id": cs.subject_id,
            "subject_name": cs.subject.name,
            "teacher_id": cs.teacher.user_id,
            "teacher_name": f"{cs.teacher.user.first_name} {cs.teacher.user.last_name}"
        }
        for cs in assignments
    ]

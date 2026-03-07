from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Staff, Student, Parent, Class,
    ClassSubject, Subject, UserRole
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["users"])


# --- Shared ---
@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base = {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "phone": current_user.phone,
    }

    if current_user.role == UserRole.TEACHER: # type: ignore
        staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if staff:
            base["employee_number"] = staff.employee_number
            base["department"] = staff.department
            base["job_title"] = staff.job_title

    elif current_user.role == UserRole.STUDENT: # type: ignore
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            base["student_number"] = student.student_number
            base["grade_level"] = student.grade_level

    elif current_user.role == UserRole.PARENT: # type: ignore
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if parent:
            children = []
            for assoc in parent.student_associations:
                child = assoc.student
                children.append({
                    "id": child.id,
                    "student_number": child.student_number,
                    "first_name": child.user.first_name,
                    "last_name": child.user.last_name,
                    "grade_level": child.grade_level,
                    "class_name": child.homeroom_class.name if child.homeroom_class else None
                })
            base["children"] = children

    return base


# --- Teacher Dashboard Data ---
@router.get("/teacher/dashboard")
def get_teacher_dashboard(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    class_subjects = db.query(ClassSubject).filter(ClassSubject.teacher_id == staff.id).all()

    classes = []
    for cs in class_subjects:
        classes.append({
            "class_subject_id": cs.id,
            "class_id": cs.class_id,
            "class_name": cs.homeroom_class.name,
            "grade_level": cs.homeroom_class.grade_level,
            "subject_name": cs.subject.name,
            "subject_code": cs.subject.code,
            "student_count": len(cs.homeroom_class.students)
        })

    return {
        "staff_id": staff.id,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "job_title": staff.job_title,
        "department": staff.department,
        "classes": classes
    }


# --- Student Dashboard Data ---
@router.get("/student/dashboard")
def get_student_dashboard(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    subjects = []
    if student.homeroom_class:
        class_subjects = db.query(ClassSubject).filter(
            ClassSubject.class_id == student.class_id
        ).all()
        for cs in class_subjects:
            subjects.append({
                "class_subject_id": cs.id,
                "subject_name": cs.subject.name,
                "subject_code": cs.subject.code,
                "teacher_name": f"{cs.teacher.user.first_name} {cs.teacher.user.last_name}"
            })

    return {
        "student_id": student.id,
        "student_number": student.student_number,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "grade_level": student.grade_level,
        "class_name": student.homeroom_class.name if student.homeroom_class else None,
        "homeroom_teacher": (
            f"{student.homeroom_class.homeroom_teacher.user.first_name} "
            f"{student.homeroom_class.homeroom_teacher.user.last_name}"
        ) if student.homeroom_class and student.homeroom_class.homeroom_teacher else None,
        "subjects": subjects
    }


# --- Parent Dashboard Data ---
@router.get("/parent/dashboard")
def get_parent_dashboard(
    current_user: User = Depends(require_role(UserRole.PARENT)),
    db: Session = Depends(get_db)
):
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    children = []
    for assoc in parent.student_associations:
        child = assoc.student
        subjects = []
        if child.homeroom_class:
            class_subjects = db.query(ClassSubject).filter(
                ClassSubject.class_id == child.class_id
            ).all()
            for cs in class_subjects:
                subjects.append({
                    "subject_name": cs.subject.name,
                    "teacher_name": f"{cs.teacher.user.first_name} {cs.teacher.user.last_name}"
                })

        children.append({
            "student_id": child.id,
            "student_number": child.student_number,
            "name": f"{child.user.first_name} {child.user.last_name}",
            "grade_level": child.grade_level,
            "class_name": child.homeroom_class.name if child.homeroom_class else None,
            "relationship": assoc.relationship_type,
            "subjects": subjects
        })

    return {
        "parent_id": parent.id,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "children": children
    }


# --- Principal Dashboard Data ---
@router.get("/principal/dashboard")
def get_principal_dashboard(
    current_user: User = Depends(require_role(UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    classes = db.query(Class).all()
    all_staff = db.query(Staff).all()

    classes_summary = []
    for c in classes:
        classes_summary.append({
            "class_id": c.id,
            "class_name": c.name,
            "grade_level": c.grade_level,
            "student_count": len(c.students),
            "homeroom_teacher": (
                f"{c.homeroom_teacher.user.first_name} {c.homeroom_teacher.user.last_name}"
            ) if c.homeroom_teacher else None
        })

    staff_summary = []
    for s in all_staff:
        staff_summary.append({
            "staff_id": s.id,
            "name": f"{s.user.first_name} {s.user.last_name}",
            "job_title": s.job_title,
            "department": s.department,
        })

    return {
        "total_students": sum(c["student_count"] for c in classes_summary),
        "total_staff": len(staff_summary),
        "total_classes": len(classes_summary),
        "classes": classes_summary,
        "staff": staff_summary
    }


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Staff, Student, Parent, ParentStudent,
    Assignment, ClassSubject, UserRole, StudentSubjectEnrolment
)
from auth import get_current_user, require_role
from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional
from models import Grade


def get_active_enrolment_map(student_id: int, db: Session):
    enrolments = db.query(StudentSubjectEnrolment).filter(
        StudentSubjectEnrolment.student_id == student_id
    ).all()
    return {e.class_subject_id: e for e in enrolments}


def is_enrolled_for_assignment(enrolment: StudentSubjectEnrolment, assignment_due_date: date):
    if enrolment.enrolled_date > assignment_due_date:
        return False
    if enrolment.end_date and enrolment.end_date < assignment_due_date:
        return False
    return True

router = APIRouter(prefix="/homework", tags=["homework"])


# --- Pydantic Schemas ---
class AssignmentCreate(BaseModel):
    class_subject_id: int
    title: str
    description: Optional[str] = None
    due_date: date
    max_marks: Optional[int] = None
    is_published: bool = True


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    max_marks: Optional[int] = None
    is_published: Optional[bool] = None


# --- Create Assignment (Teacher) ---
@router.post("/create")
def create_assignment(
    request: AssignmentCreate,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    # Verify teacher is assigned to this class subject
    class_subject = db.query(ClassSubject).filter(
        ClassSubject.id == request.class_subject_id,
        ClassSubject.teacher_id == staff.id
    ).first()

    if not class_subject:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this class subject"
        )

    assignment = Assignment(
        class_subject_id=request.class_subject_id,
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        max_marks=request.max_marks,
        created_by=staff.id,
        created_at=datetime.utcnow(),
        is_published=request.is_published
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return {
        "message": "Assignment created successfully",
        "assignment_id": assignment.id,
        "title": assignment.title,
        "due_date": assignment.due_date,
        "is_published": assignment.is_published
    }


# --- Update Assignment (Teacher) ---
@router.put("/update/{assignment_id}")
def update_assignment(
    assignment_id: int,
    request: AssignmentUpdate,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.created_by != staff.id:  # type: ignore
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own assignments"
        )

    if request.title is not None:
        assignment.title = request.title  # type: ignore
    if request.description is not None:
        assignment.description = request.description  # type: ignore
    if request.due_date is not None:
        assignment.due_date = request.due_date  # type: ignore
    if request.max_marks is not None:
        assignment.max_marks = request.max_marks  # type: ignore
    if request.is_published is not None:
        assignment.is_published = request.is_published  # type: ignore

    db.commit()
    return {"message": "Assignment updated successfully"}


# --- Delete Assignment (Teacher) ---
@router.delete("/delete/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.created_by != staff.id:  # type: ignore
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own assignments"
        )

    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted successfully"}


# --- Get Teacher's Assignments ---
@router.get("/teacher/mine")
def get_my_assignments(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    assignments = db.query(Assignment).filter(
        Assignment.created_by == staff.id
    ).order_by(Assignment.due_date.desc()).all()

    result = []
    for a in assignments:
            # Prefer enrolment records when available; fallback keeps legacy behavior.
            valid_students = []
            for s in a.class_subject.homeroom_class.students:
                enrolment = db.query(StudentSubjectEnrolment).filter(
                    StudentSubjectEnrolment.student_id == s.id,
                    StudentSubjectEnrolment.class_subject_id == a.class_subject_id,
                    StudentSubjectEnrolment.enrolled_date <= a.due_date
                ).order_by(StudentSubjectEnrolment.enrolled_date.desc()).first()

                if enrolment:
                    if enrolment.end_date is None or enrolment.end_date >= a.due_date:
                        valid_students.append(s)
                elif s.user.created_at.date() <= a.due_date:
                    valid_students.append(s)

            result.append({
                "assignment_id": a.id,
                "title": a.title,
                "description": a.description,
                "due_date": a.due_date,
                "max_marks": a.max_marks,
                "class_id": a.class_subject.homeroom_class.id,
                "class_name": a.class_subject.homeroom_class.name,
                "subject_name": a.class_subject.subject.name,
                "is_published": a.is_published,
                "is_past_due": a.due_date < date.today(),  # type: ignore
                "grades_entered": len(a.grades),
                "student_count": len(valid_students)
            })

    return result


# --- Get Student's Assignments ---
@router.get("/student/mine")
def get_student_assignments(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Assignments should only appear for subjects the student is actively enrolled in.
    enrolment_map = get_active_enrolment_map(student.id, db)
    class_subject_ids = [e.class_subject_id for e in enrolment_map.values()]
    if not class_subject_ids:
        class_subjects = db.query(ClassSubject).filter(
            ClassSubject.class_id == student.class_id
        ).all()
        class_subject_ids = [cs.id for cs in class_subjects]

    # Get all published assignments for those class subjects
    assignments = db.query(Assignment).filter(
        Assignment.class_subject_id.in_(class_subject_ids),
        Assignment.is_published == True  # noqa: E712
    ).order_by(Assignment.due_date.asc()).all()

    upcoming = []
    past = []

    for a in assignments:
        if enrolment_map:
            enrolment = enrolment_map.get(a.class_subject_id)
            if not enrolment or not is_enrolled_for_assignment(enrolment, a.due_date):
                continue
        entry = {
            "assignment_id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date,
            "max_marks": a.max_marks,
            "subject_name": a.class_subject.subject.name,
            "teacher_name": f"{a.class_subject.teacher.user.first_name} {a.class_subject.teacher.user.last_name}",
        }
        if a.due_date >= date.today():  # type: ignore
            upcoming.append(entry)
        else:
            # Look for grade entry to determine if it's past due or just not published yet
            grade = db.query(Grade).filter(
                Grade.assignment_id == a.id,
                Grade.student_id == student.id,
                Grade.is_released == True # noqa: E712
            ).first()

            entry["marks_awarded"] = grade.marks_awarded if grade else None # type: ignore
            entry["feedback"] = grade.feedback if grade else None # type: ignore
            entry["graded"] = grade is not None
            past.append(entry)

    return {
        "upcoming": upcoming,
        "past": past
    }


# --- Get Child's Assignments (Parent) ---
@router.get("/parent/child/{student_id}")
def get_child_assignments(
    student_id: int,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    db: Session = Depends(get_db)
):
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    association = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == student_id
    ).first()

    if not association:
        raise HTTPException(
            status_code=403,
            detail="You are not linked to this student"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrolment_map = get_active_enrolment_map(student.id, db)
    class_subject_ids = [e.class_subject_id for e in enrolment_map.values()]
    if not class_subject_ids:
        class_subjects = db.query(ClassSubject).filter(
            ClassSubject.class_id == student.class_id
        ).all()
        class_subject_ids = [cs.id for cs in class_subjects]

    assignments = db.query(Assignment).filter(
        Assignment.class_subject_id.in_(class_subject_ids),
        Assignment.is_published == True  # noqa: E712
    ).order_by(Assignment.due_date.asc()).all()

    upcoming = []
    past = []

    for a in assignments:
        if enrolment_map:
            enrolment = enrolment_map.get(a.class_subject_id)
            if not enrolment or not is_enrolled_for_assignment(enrolment, a.due_date):
                continue
        entry = {
            "assignment_id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date,
            "max_marks": a.max_marks,
            "subject_name": a.class_subject.subject.name,
            "teacher_name": f"{a.class_subject.teacher.user.first_name} {a.class_subject.teacher.user.last_name}",
        }
        if a.due_date >= date.today():  # type: ignore
            upcoming.append(entry)
        else:
            #look for grade entry to determine if it's past due or just not published yet
            grade = db.query(Grade).filter(
                Grade.assignment_id == a.id,
                Grade.student_id == student_id,
                Grade.is_released == True  # noqa: E712
            ).first()
            entry["marks_awarded"] = grade.marks_awarded if grade else None
            entry["feedback"] = grade.feedback if grade else None
            entry["graded"] = grade is not None
            past.append(entry)

    return {
        "student_name": f"{student.user.first_name} {student.user.last_name}",
        "upcoming": upcoming,
        "past": past
    }
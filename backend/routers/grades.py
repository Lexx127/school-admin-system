from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Staff, Student, Parent, ParentStudent,
    Grade, Assignment, ClassSubject, UserRole
)
from auth import require_role
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/grades", tags=["grades"])


# --- Pydantic Schemas ---
class GradeEntry(BaseModel):
    student_id: int
    marks_awarded: float
    feedback: Optional[str] = None


class BulkGradeRequest(BaseModel):
    assignment_id: int
    grades: list[GradeEntry]


class GradeUpdate(BaseModel):
    marks_awarded: Optional[float] = None
    feedback: Optional[str] = None


# --- Enter Grades for an Assignment (Teacher) ---
@router.post("/enter")
def enter_grades(
    request: BulkGradeRequest,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    assignment = db.query(Assignment).filter(Assignment.id == request.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Verify teacher owns this assignment
    if assignment.created_by != staff.id:  # type: ignore
        raise HTTPException(
            status_code=403,
            detail="You can only enter grades for your own assignments"
        )

    entered = 0
    updated = 0

    for entry in request.grades:
        # Validate marks don't exceed maximum
        if assignment.max_marks and entry.marks_awarded > assignment.max_marks:  # type: ignore
            raise HTTPException(
                status_code=400,
                detail=f"Marks awarded ({entry.marks_awarded}) exceed max marks ({assignment.max_marks}) for student {entry.student_id}"
            )

        # Check if grade already exists for this student
        existing = db.query(Grade).filter(
            Grade.assignment_id == request.assignment_id,
            Grade.student_id == entry.student_id
        ).first()

        if existing:
            existing.marks_awarded = entry.marks_awarded  # type: ignore
            existing.feedback = entry.feedback  # type: ignore
            existing.graded_at = datetime.utcnow()  # type: ignore
            updated += 1
        else:
            grade = Grade(
                assignment_id=request.assignment_id,
                student_id=entry.student_id,
                marks_awarded=entry.marks_awarded,
                feedback=entry.feedback,
                graded_by=staff.id,
                graded_at=datetime.utcnow(),
                is_released=False
            )
            db.add(grade)
            entered += 1

    db.commit()
    return {
        "message": f"Grades saved — {entered} entered, {updated} updated",
        "released": False,
        "note": "Grades are not yet visible to students. Use /grades/release to publish them."
    }


# --- Release Grades for an Assignment (Teacher) ---
@router.post("/release/{assignment_id}")
def release_grades(
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
            detail="You can only release grades for your own assignments"
        )

    grades = db.query(Grade).filter(Grade.assignment_id == assignment_id).all()
    if not grades:
        raise HTTPException(status_code=404, detail="No grades found for this assignment")

    for grade in grades:
        grade.is_released = True  # type: ignore

    db.commit()
    return {
        "message": f"Grades released for {len(grades)} students",
        "assignment_title": assignment.title
    }


# --- Update a Single Grade (Teacher) ---
@router.put("/update/{grade_id}")
def update_grade(
    grade_id: int,
    request: GradeUpdate,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    if grade.graded_by != staff.id:  # type: ignore
        raise HTTPException(
            status_code=403,
            detail="You can only update grades you have entered"
        )

    if request.marks_awarded is not None:
        assignment = db.query(Assignment).filter(
            Assignment.id == grade.assignment_id
        ).first()
        if assignment and assignment.max_marks and request.marks_awarded > assignment.max_marks:  # type: ignore
            raise HTTPException(
                status_code=400,
                detail=f"Marks awarded exceed max marks of {assignment.max_marks}"
            )
        grade.marks_awarded = request.marks_awarded  # type: ignore

    if request.feedback is not None:
        grade.feedback = request.feedback  # type: ignore

    grade.graded_at = datetime.utcnow()  # type: ignore
    db.commit()
    return {"message": "Grade updated successfully"}


# --- View All My Grades (Student) ---
@router.get("/student/mine")
def get_my_grades(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    grades = db.query(Grade).filter(
        Grade.student_id == student.id,
        Grade.is_released == True  # noqa: E712
    ).all()

    # Group grades by subject
    subjects = {}
    for g in grades:
        subject_name = g.assignment.class_subject.subject.name
        if subject_name not in subjects:
            subjects[subject_name] = {
                "subject_name": subject_name,
                "teacher_name": f"{g.assignment.class_subject.teacher.user.first_name} {g.assignment.class_subject.teacher.user.last_name}",
                "grades": [],
                "total_marks_awarded": 0,
                "total_max_marks": 0
            }
        subjects[subject_name]["grades"].append({
            "assignment_title": g.assignment.title,
            "marks_awarded": g.marks_awarded,
            "max_marks": g.assignment.max_marks,
            "feedback": g.feedback,
            "graded_at": g.graded_at
        })
        subjects[subject_name]["total_marks_awarded"] += g.marks_awarded or 0
        subjects[subject_name]["total_max_marks"] += g.assignment.max_marks or 0

    # Calculate percentage per subject
    result = []
    for subject in subjects.values():
        if subject["total_max_marks"] > 0:
            subject["overall_percentage"] = round(
                subject["total_marks_awarded"] / subject["total_max_marks"] * 100, 1
            )
        else:
            subject["overall_percentage"] = None
        result.append(subject)

    return {
        "student_name": f"{current_user.first_name} {current_user.last_name}",
        "grades_by_subject": result
    }


# --- View Child Grades (Parent) ---
@router.get("/parent/child/{student_id}")
def get_child_grades(
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

    grades = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.is_released == True  # noqa: E712
    ).all()

    subjects = {}
    for g in grades:
        subject_name = g.assignment.class_subject.subject.name
        if subject_name not in subjects:
            subjects[subject_name] = {
                "subject_name": subject_name,
                "teacher_name": f"{g.assignment.class_subject.teacher.user.first_name} {g.assignment.class_subject.teacher.user.last_name}",
                "grades": [],
                "total_marks_awarded": 0,
                "total_max_marks": 0
            }
        subjects[subject_name]["grades"].append({
            "assignment_title": g.assignment.title,
            "marks_awarded": g.marks_awarded,
            "max_marks": g.assignment.max_marks,
            "feedback": g.feedback,
            "graded_at": g.graded_at
        })
        subjects[subject_name]["total_marks_awarded"] += g.marks_awarded or 0
        subjects[subject_name]["total_max_marks"] += g.assignment.max_marks or 0

    result = []
    for subject in subjects.values():
        if subject["total_max_marks"] > 0:
            subject["overall_percentage"] = round(
                subject["total_marks_awarded"] / subject["total_max_marks"] * 100, 1
            )
        else:
            subject["overall_percentage"] = None
        result.append(subject)

    return {
        "student_name": f"{student.user.first_name} {student.user.last_name}",  # type: ignore
        "grades_by_subject": result
    }


# --- Principal View All Class Grades Summary ---
@router.get("/principal/summary")
def get_grades_summary(
    current_user: User = Depends(require_role(UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    class_subjects = db.query(ClassSubject).all()

    summary = []
    for cs in class_subjects:
        assignments = db.query(Assignment).filter(
            Assignment.class_subject_id == cs.id
        ).all()

        total_grades = 0
        total_percentage = 0
        graded_count = 0

        for a in assignments:
            for g in a.grades:
                if g.is_released and g.marks_awarded is not None and a.max_marks:  # type: ignore
                    total_percentage += (g.marks_awarded / a.max_marks * 100)
                    graded_count += 1
                total_grades += 1

        summary.append({
            "class_name": cs.homeroom_class.name,
            "subject_name": cs.subject.name,
            "teacher_name": f"{cs.teacher.user.first_name} {cs.teacher.user.last_name}",
            "total_assignments": len(assignments),
            "total_grades": total_grades,
            "class_average": round(total_percentage / graded_count, 1) if graded_count > 0 else None
        })

    return {"class_subject_summaries": summary}
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Staff, Student, Parent, Class,
    ClassSubject, Subject, UserRole, ParentStudent
)
from auth import get_current_user, require_role, hash_password
from pydantic import BaseModel
from typing import Optional
from datetime import date

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

    if current_user.role == UserRole.TEACHER:  # type: ignore
        staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if staff:
            base["employee_number"] = staff.employee_number
            base["department"] = staff.department
            base["job_title"] = staff.job_title

    elif current_user.role == UserRole.STUDENT:  # type: ignore
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            base["student_number"] = student.student_number
            base["grade_level"] = student.grade_level

    elif current_user.role == UserRole.PARENT:  # type: ignore
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


# --- Pydantic Schemas for Admin ---
class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None


class StudentCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    student_number: str
    date_of_birth: Optional[str] = None
    grade_level: str
    class_id: int


class StaffCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: UserRole
    employee_number: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    primary_subject_id: Optional[int] = None


class ParentCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None


class ParentStudentLink(BaseModel):
    parent_id: int
    student_id: int
    relationship_type: Optional[str] = None


# --- Create Student Account (Admin only) ---
@router.post("/admin/create/student")
def create_student(
    request: StudentCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole.STUDENT,
        first_name=request.first_name,
        last_name=request.last_name,
        is_active=True
    )
    db.add(user)
    db.commit()

    student = Student(
        user_id=user.id,
        student_number=request.student_number,
        grade_level=request.grade_level,
        class_id=request.class_id
    )
    db.add(student)
    db.commit()

    return {
        "message": "Student account created successfully",
        "user_id": user.id,
        "student_number": request.student_number
    }


# --- Create Staff Account (Admin only) ---
@router.post("/admin/create/staff")
def create_staff(
    request: StaffCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role,
        first_name=request.first_name,
        last_name=request.last_name,
        is_active=True
    )
    db.add(user)
    db.commit()

    staff = Staff(
        user_id=user.id,
        employee_number=request.employee_number,
        department=request.department,
        job_title=request.job_title,
        primary_subject_id=request.primary_subject_id
    )
    db.add(staff)
    db.commit()

    return {
        "message": "Staff account created successfully",
        "user_id": user.id,
        "employee_number": request.employee_number
    }


# --- Create Parent Account (Admin only) ---
@router.post("/admin/create/parent")
def create_parent(
    request: ParentCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole.PARENT,
        first_name=request.first_name,
        last_name=request.last_name,
        phone=request.phone,
        is_active=True
    )
    db.add(user)
    db.commit()

    parent = Parent(
        user_id=user.id,
        whatsapp_number=request.whatsapp_number
    )
    db.add(parent)
    db.commit()

    return {
        "message": "Parent account created successfully",
        "user_id": user.id
    }


# --- Link Parent to Student (Admin only) ---
@router.post("/admin/link/parent-student")
def link_parent_student(
    request: ParentStudentLink,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    parent = db.query(Parent).filter(Parent.user_id == request.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    student = db.query(Student).filter(Student.user_id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    existing = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This parent is already linked to this student")

    association = ParentStudent(
        parent_id=parent.id,
        student_id=student.id,
        relationship_type=request.relationship_type
    )
    db.add(association)
    db.commit()

    return {"message": "Parent linked to student successfully"}


# --- Deactivate or Reactivate a User (Admin only) ---
@router.put("/admin/toggle-active/{user_id}")
def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active  # type: ignore
    db.commit()

    status = "activated" if user.is_active else "deactivated"  # type: ignore
    return {
        "message": f"User {status} successfully",
        "user_id": user_id,
        "is_active": user.is_active
    }


# --- Get All Users (Admin only) ---
@router.get("/admin/all")
def get_all_users(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.role, User.last_name).all()
    return [
        {
            "user_id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.get("/parents/with-students")
def get_parents_with_students(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)),
    db: Session = Depends(get_db)
):
    parents = db.query(Parent).all()
    result = []
    for p in parents:
        children = []
        for assoc in p.student_associations:
            child = assoc.student.user
            children.append(f"{child.first_name} {child.last_name}")
        result.append({
            "user_id": p.user_id,
            "first_name": p.user.first_name,
            "last_name": p.user.last_name,
            "email": p.user.email,
            "children_names": children
        })
    return result


@router.get("/classes/all")
def get_all_classes(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)),
    db: Session = Depends(get_db)
):
    classes = db.query(Class).all()
    return [{"class_id": c.id, "class_name": c.name} for c in classes]


@router.get("/staff/all")
def get_messaging_staff(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.PARENT)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).all()
    return [
        {
            "user_id": s.user_id,
            "name": f"{s.user.first_name} {s.user.last_name}",
            "role": s.user.role,
            "department": s.department,
            "job_title": s.job_title
        }
        for s in staff
    ]


@router.get("/parents/all")
def get_messaging_parents(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)),
    db: Session = Depends(get_db)
):
    parents = db.query(Parent).all()
    return [
        {
            "user_id": p.user_id,
            "name": f"{p.user.first_name} {p.user.last_name}",
            "email": p.user.email
        }
        for p in parents
    ]


@router.get("/classes/{class_id}/info")
def get_class_details(
    class_id: int,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)),
    db: Session = Depends(get_db)
):
    from models import StudentAttendance, AttendanceStatus

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    students_data = []
    for student in cls.students:
        parents = [
            f"{assoc.parent.user.first_name} {assoc.parent.user.last_name}"
            for assoc in student.parent_associations
        ]

        subject_grades: dict = {}
        for grade in student.grades:
            subj_name = grade.assignment.class_subject.subject.name
            if subj_name not in subject_grades:
                subject_grades[subj_name] = {"earned": 0, "possible": 0}
            if grade.marks_awarded is not None and grade.assignment.max_marks is not None:
                subject_grades[subj_name]["earned"] += grade.marks_awarded
                subject_grades[subj_name]["possible"] += grade.assignment.max_marks

        grades_by_subject = []
        total_earned = 0
        total_possible = 0
        for subj, data in subject_grades.items():
            if data["possible"] > 0:
                perc = (data["earned"] / data["possible"]) * 100
                grades_by_subject.append({"subject": subj, "percentage": round(perc, 1)})
                total_earned += data["earned"]
                total_possible += data["possible"]

        average_grade = round((total_earned / total_possible) * 100, 1) if total_possible > 0 else None

        total_days = len(student.attendance_records)
        present_days = sum(
            1 for a in student.attendance_records
            if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE]
        )
        attendance_percentage = round((present_days / total_days) * 100, 1) if total_days > 0 else None

        students_data.append({
            "student_id": student.id,
            "name": f"{student.user.first_name} {student.user.last_name}",
        })

    return {
        "class_id": cls.id,
        "class_name": cls.name,
        "students": students_data
    }


@router.get("/students/all")
def get_all_students(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)),
    db: Session = Depends(get_db)
):
    students = db.query(Student).all()
    return [
        {
            "student_id": s.id,
            "user_id": s.user_id,
            "student_number": s.student_number,
            "first_name": s.user.first_name,
            "last_name": s.user.last_name,
            "grade_level": s.grade_level,
            "class_name": s.homeroom_class.name if s.homeroom_class else None
        }
        for s in students
    ]

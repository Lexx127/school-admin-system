from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Staff, Student, StudentAttendance,
    StaffClockIn, Class, ClassSubject,
    AttendanceStatus, UserRole, Parent, ParentStudent
)
from auth import get_current_user, require_role
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/attendance", tags=["attendance"])


# --- Pydantic Schemas ---
class StudentAttendanceEntry(BaseModel):
    student_id: int
    status: AttendanceStatus
    notes: Optional[str] = None


class BulkAttendanceRequest(BaseModel):
    class_id: int
    date: date
    records: list[StudentAttendanceEntry]


# --- Take Student Attendance (Teacher) ---
@router.post("/students/take")
def take_attendance(
    request: BulkAttendanceRequest,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    # Verify teacher teaches this class
    class_subject = db.query(ClassSubject).filter(
        ClassSubject.class_id == request.class_id,
        ClassSubject.teacher_id == staff.id
    ).first()

    homeroom_check = db.query(Class).filter(
        Class.id == request.class_id,
        Class.homeroom_teacher_id == staff.id
    ).first()

    if not class_subject and not homeroom_check:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this class"
        )

    # Check attendance not already taken for this date
    existing = db.query(StudentAttendance).filter(
        StudentAttendance.class_id == request.class_id,
        StudentAttendance.date == request.date
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Attendance has already been taken for this class on this date"
        )

    # Create attendance records
    for entry in request.records:
        record = StudentAttendance(
            student_id=entry.student_id,
            class_id=request.class_id,
            date=request.date,
            status=entry.status,
            recorded_by=staff.id,
            notes=entry.notes,
            recorded_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    return {"message": f"Attendance recorded for {len(request.records)} students"}


# --- View Attendance For a Class (Teacher/Principal) ---
@router.get("/students/class/{class_id}")
def get_class_attendance(
    class_id: int,
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    records = db.query(StudentAttendance).filter(
        StudentAttendance.class_id == class_id
    ).order_by(StudentAttendance.date.desc()).all()

    result = []
    for r in records:
        result.append({
            "date": r.date,
            "student_name": f"{r.student.user.first_name} {r.student.user.last_name}",
            "student_number": r.student.student_number,
            "status": r.status,
            "notes": r.notes,
            "recorded_by": f"{r.recorded_by_staff.user.first_name} {r.recorded_by_staff.user.last_name}"
        })

    return result


# --- View Own Attendance (Student) ---
@router.get("/students/me")
def get_my_attendance(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    records = db.query(StudentAttendance).filter(
        StudentAttendance.student_id == student.id
    ).order_by(StudentAttendance.date.desc()).all()

    total_days = len(records)
    days_attended = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
    days_absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT) # type: ignore
    days_late = sum(1 for r in records if r.status == AttendanceStatus.LATE) # type: ignore
    attendance_percentage = round((days_attended / total_days * 100), 1) if total_days > 0 else 0

    return {
        "student_name": f"{current_user.first_name} {current_user.last_name}",
        "student_number": student.student_number,
        "summary": {
            "total_days": total_days,
            "days_attended": days_attended,
            "days_absent": days_absent,
            "days_late": days_late,
            "attendance_percentage": attendance_percentage
        },
        "records": [
            {
                "date": r.date,
                "status": r.status,
                "notes": r.notes
            }
            for r in records
        ]
    }


# --- View Child Attendance (Parent) ---
@router.get("/students/child/{student_id}")
def get_child_attendance(
    student_id: int,
    current_user: User = Depends(require_role(UserRole.PARENT)),
    db: Session = Depends(get_db)
):
    # Verify this parent is linked to this student
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    association = db.query(ParentStudent).filter( # type: ignore
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == student_id
    ).first()

    if not association:
        raise HTTPException(
            status_code=403,
            detail="You are not linked to this student"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    records = db.query(StudentAttendance).filter(
        StudentAttendance.student_id == student_id
    ).order_by(StudentAttendance.date.desc()).all()

    total_days = len(records)
    days_attended = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
    days_absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT) # type: ignore
    days_late = sum(1 for r in records if r.status == AttendanceStatus.LATE) # type: ignore
    attendance_percentage = round((days_attended / total_days * 100), 1) if total_days > 0 else 0

    return {
        "student_name": f"{student.user.first_name} {student.user.last_name}", # type: ignore
        "student_number": student.student_number, # type: ignore
        "summary": {
            "total_days": total_days,
            "days_attended": days_attended,
            "days_absent": days_absent,
            "days_late": days_late,
            "attendance_percentage": attendance_percentage
        },
        "records": [
            {
                "date": r.date,
                "status": r.status,
                "notes": r.notes
            }
            for r in records
        ]
    }


# --- Staff Clock In ---
@router.post("/staff/clockin")
def clock_in(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    today = date.today()
    now = datetime.utcnow()

    # Check already clocked in today
    existing = db.query(StaffClockIn).filter(
        StaffClockIn.staff_id == staff.id,
        StaffClockIn.date == today
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already clocked in today"
        )

    # Check if late — compare against 07:30
    deadline_hour, deadline_minute = 7, 30
    is_late = now.hour > deadline_hour or (now.hour == deadline_hour and now.minute > deadline_minute)
    flag_reason = f"Arrived late - {now.strftime('%H:%M')}" if is_late else None

    clock_in_record = StaffClockIn(
        staff_id=staff.id,
        date=today,
        clock_in_time=now,
        flagged=is_late,
        flag_reason=flag_reason
    )
    db.add(clock_in_record)
    db.commit()

    return {
        "message": "Clocked in successfully",
        "time": now.strftime("%H:%M"),
        "flagged": is_late,
        "flag_reason": flag_reason
    }


# --- Staff Clock Out ---
@router.post("/staff/clockout")
def clock_out(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    today = date.today()
    now = datetime.utcnow()

    record = db.query(StaffClockIn).filter(
        StaffClockIn.staff_id == staff.id,
        StaffClockIn.date == today
    ).first()

    if not record:
        raise HTTPException(
            status_code=400,
            detail="You have not clocked in today"
        )

    if record.clock_out_time:  # type: ignore
        raise HTTPException(
            status_code=400,
            detail="You have already clocked out today"
        )

    record.clock_out_time = now  # type: ignore
    db.commit()

    return {
        "message": "Clocked out successfully",
        "time": now.strftime("%H:%M")
    }


# --- Principal View All Staff Clock Ins ---
@router.get("/staff/all")
def get_all_staff_clockins(
    current_user: User = Depends(require_role(UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    records = db.query(StaffClockIn).order_by(StaffClockIn.date.desc()).all()

    result = []
    for r in records:
        result.append({
            "staff_name": f"{r.staff.user.first_name} {r.staff.user.last_name}",
            "job_title": r.staff.job_title,
            "date": r.date,
            "clock_in_time": r.clock_in_time.strftime("%H:%M") if r.clock_in_time else None, # type: ignore
            "clock_out_time": r.clock_out_time.strftime("%H:%M") if r.clock_out_time else None, # type: ignore
            "flagged": r.flagged,
            "flag_reason": r.flag_reason
        })

    flagged_count = sum(1 for r in records if r.flagged) # type: ignore

    return {
        "total_records": len(records),
        "flagged_count": flagged_count,
        "records": result
    }
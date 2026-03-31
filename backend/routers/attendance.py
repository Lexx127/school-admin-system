from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from sqlalchemy import func
from models import (
    User, Staff, Student, StudentAttendance,
    StaffClockIn, Class, ClassSubject,
    AttendanceStatus, UserRole, Parent, ParentStudent, SchoolTerm, SchoolCalendarDay, DayType
)
from auth import get_current_user, require_role
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _current_term(db: Session):
    today = date.today()
    return db.query(SchoolTerm).filter(
        SchoolTerm.start_date <= today,
        SchoolTerm.end_date >= today
    ).first()


def _attendance_summary_for_records(records, school_day_count: int):
    days_attended = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
    days_absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)  # type: ignore
    days_late = sum(1 for r in records if r.status == AttendanceStatus.LATE)  # type: ignore
    denominator = school_day_count if school_day_count > 0 else len(records)
    attendance_percentage = round((days_attended / denominator * 100), 1) if denominator > 0 else 0
    return {
        "total_days": denominator,
        "days_attended": days_attended,
        "days_absent": days_absent,
        "days_late": days_late,
        "attendance_percentage": attendance_percentage
    }


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

    # Verify teacher is the homeroom teacher for this class
    if current_user.role == UserRole.TEACHER:
        homeroom_check = db.query(Class).filter(
            Class.id == request.class_id,
            Class.homeroom_teacher_id == staff.id
        ).first()

        if not homeroom_check:
            raise HTTPException(
                status_code=403,
                detail="You are not the homeroom teacher for this class"
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

    term = _current_term(db)
    if term:
        records = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == student.id,
            StudentAttendance.date >= term.start_date,
            StudentAttendance.date <= min(term.end_date, date.today())
        ).order_by(StudentAttendance.date.desc()).all()
        school_day_count = db.query(SchoolCalendarDay).filter(
            SchoolCalendarDay.date >= term.start_date,
            SchoolCalendarDay.date <= min(term.end_date, date.today()),
            SchoolCalendarDay.day_type == DayType.SCHOOL_DAY
        ).count()
    else:
        records = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == student.id
        ).order_by(StudentAttendance.date.desc()).all()
        school_day_count = 0

    return {
        "student_name": f"{current_user.first_name} {current_user.last_name}",
        "student_number": student.student_number,
        "summary": _attendance_summary_for_records(records, school_day_count),
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
    term = _current_term(db)
    if term:
        records = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == student_id,
            StudentAttendance.date >= term.start_date,
            StudentAttendance.date <= min(term.end_date, date.today())
        ).order_by(StudentAttendance.date.desc()).all()
        school_day_count = db.query(SchoolCalendarDay).filter(
            SchoolCalendarDay.date >= term.start_date,
            SchoolCalendarDay.date <= min(term.end_date, date.today()),
            SchoolCalendarDay.day_type == DayType.SCHOOL_DAY
        ).count()
    else:
        records = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == student_id
        ).order_by(StudentAttendance.date.desc()).all()
        school_day_count = 0

    return {
        "student_name": f"{student.user.first_name} {student.user.last_name}", # type: ignore
        "student_number": student.student_number, # type: ignore
        "summary": _attendance_summary_for_records(records, school_day_count),
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

@router.post("/staff/kiosk")
def kiosk_clock_action(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Kiosk endpoint — authenticates a staff member and clocks them in or out
    in a single request without creating a session cookie.
    """
    from auth import verify_password
    from models import SchoolSettings

    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    action = payload.get("action", "in")
    kiosk_code = payload.get("kiosk_code", "")

    # Verify kiosk access code
    setting = db.query(SchoolSettings).filter(
        SchoolSettings.key == "kiosk_code"
    ).first()
    expected_code = setting.value if setting else "1234"
    if kiosk_code != expected_code:
        raise HTTPException(status_code=403, detail="Invalid kiosk access code")

    # Authenticate the staff member
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash): # type: ignore
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.role not in [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN]:  # type: ignore
        raise HTTPException(status_code=403, detail="Only staff can use the kiosk")

    staff = db.query(Staff).filter(Staff.user_id == user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff record not found")

    now = datetime.now()
    today = now.date()
    time_str = now.strftime("%H:%M")

    if action == "in":
        # Check if already clocked in today
        existing = db.query(StaffClockIn).filter(
            StaffClockIn.staff_id == staff.id,
            func.date(StaffClockIn.clock_in_time) == today
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"{user.first_name} has already clocked in today at {existing.clock_in_time.strftime('%H:%M')}"
            )

        # Check if late
        deadline_str = "07:30"
        deadline_setting = db.query(SchoolSettings).filter(
            SchoolSettings.key == "clockin_deadline"
        ).first()
        if deadline_setting:
            deadline_str = deadline_setting.value
        deadline_hour, deadline_min = map(int, deadline_str.split(":"))
        deadline = now.replace(hour=deadline_hour, minute=deadline_min, second=0, microsecond=0)
        flagged = now > deadline

        record = StaffClockIn(
            staff_id=staff.id,
            date=today,
            clock_in_time=now,
            flagged=flagged,
            flag_reason=f"Arrived late - {time_str}" if flagged else None
        )
        db.add(record)
        db.commit()

        return {
            "success": True,
            "action": "in",
            "staff_name": f"{user.first_name} {user.last_name}",
            "time": time_str,
            "flagged": flagged,
            "message": f"Clocked in at {time_str}" + (" — Late arrival" if flagged else "")
        }

    elif action == "out":
        record = db.query(StaffClockIn).filter(
            StaffClockIn.staff_id == staff.id,
            func.date(StaffClockIn.clock_in_time) == today
        ).first()
        if not record:
            raise HTTPException(status_code=400, detail="No clock-in record found for today")
        if record.clock_out_time: # type: ignore
            raise HTTPException(
                status_code=400,
                detail=f"{user.first_name} has already clocked out today at {record.clock_out_time.strftime('%H:%M')}"
            )

        record.clock_out_time = now # type: ignore
        db.commit()

        return {
            "success": True,
            "action": "out",
            "staff_name": f"{user.first_name} {user.last_name}",
            "time": time_str,
            "flagged": False,
            "message": f"Clocked out at {time_str}"
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid action — must be 'in' or 'out'")
    
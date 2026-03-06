from sqlalchemy import (
    Column, Integer, String, Boolean, 
    Float, Text, Date, DateTime, 
    ForeignKey, Enum
)
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    PRINCIPAL = "PRINCIPAL"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    PARENT = "PARENT"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"

class NoticeAudience(str, enum.Enum):
    ALL = "ALL"
    TEACHERS = "TEACHERS"
    STUDENTS = "STUDENTS"
    PARENTS = "PARENTS"
    CLASS = "CLASS"

class EventType(str, enum.Enum):
    SPORTS = "SPORTS"
    MEETING = "MEETING"
    ACADEMIC = "ACADEMIC"
    CULTURAL = "CULTURAL"
    OTHER = "OTHER"

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    staff_profile = relationship("Staff", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)
    parent_profile = relationship("Parent", back_populates="user", uselist=False)

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_number = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    hire_date = Column(Date, nullable=True)
    primary_subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="staff_profile")
    primary_subject = relationship("Subject", foreign_keys=[primary_subject_id])
    class_subjects = relationship("ClassSubject", back_populates="teacher")
    clock_ins = relationship("StaffClockIn", back_populates="staff")
    homeroom_class = relationship("Class", back_populates="homeroom_teacher")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    student_number = Column(String, unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    grade_level = Column(String, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    homeroom_class = relationship("Class", back_populates="students")
    parent_associations = relationship("ParentStudent", back_populates="student")
    attendance_records = relationship("StudentAttendance", back_populates="student")
    grades = relationship("Grade", back_populates="student")

class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    whatsapp_number = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="parent_profile")
    student_associations = relationship("ParentStudent", back_populates="parent")

class ParentStudent(Base):
    __tablename__ = "parent_student"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    relationship_type = Column(String, nullable=True)

    # Relationships
    parent = relationship("Parent", back_populates="student_associations")
    student = relationship("Student", back_populates="parent_associations")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    grade_level = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    homeroom_teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=True)

    # Relationships
    homeroom_teacher = relationship("Staff", back_populates="homeroom_class")
    students = relationship("Student", back_populates="homeroom_class")
    class_subjects = relationship("ClassSubject", back_populates="homeroom_class")
    attendance_records = relationship("StudentAttendance", back_populates="homeroom_class")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)

    # Relationships
    class_subjects = relationship("ClassSubject", back_populates="subject")

class ClassSubject(Base):
    __tablename__ = "class_subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    academic_year = Column(String, nullable=False)

    # Relationships
    homeroom_class = relationship("Class", back_populates="class_subjects")
    subject = relationship("Subject", back_populates="class_subjects")
    teacher = relationship("Staff", back_populates="class_subjects")
    assignments = relationship("Assignment", back_populates="class_subject")

class StaffClockIn(Base):
    __tablename__ = "staff_clock_ins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    clock_in_time = Column(DateTime, nullable=True)
    clock_out_time = Column(DateTime, nullable=True)
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String, nullable=True)

    # Relationships
    staff = relationship("Staff", back_populates="clock_ins")

class StudentAttendance(Base):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    recorded_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    notes = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    homeroom_class = relationship("Class", back_populates="attendance_records")
    recorded_by_staff = relationship("Staff", foreign_keys=[recorded_by])

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_subject_id = Column(Integer, ForeignKey("class_subjects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False)
    max_marks = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_published = Column(Boolean, default=True)

    # Relationships
    class_subject = relationship("ClassSubject", back_populates="assignments")
    created_by_staff = relationship("Staff", foreign_keys=[created_by])
    grades = relationship("Grade", back_populates="assignment")

class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    marks_awarded = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    graded_at = Column(DateTime, nullable=True)
    is_released = Column(Boolean, default=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="grades")
    student = relationship("Student", back_populates="grades")
    graded_by_staff = relationship("Staff", foreign_keys=[graded_by])

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    audience = Column(Enum(NoticeAudience), nullable=False)
    target_class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_pinned = Column(Boolean, default=False)

    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    target_class = relationship("Class", foreign_keys=[target_class_id])
    comments = relationship("NoticeComment", back_populates="notice")


class NoticeComment(Base):
    __tablename__ = "notice_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    notice_id = Column(Integer, ForeignKey("notices.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    notice = relationship("Notice", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(Enum(EventType), nullable=False)
    location = Column(String, nullable=True)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=True)
    audience = Column(Enum(NoticeAudience), nullable=False)
    target_class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_cancelled = Column(Boolean, default=False)
    cancel_reason = Column(String, nullable=True)

    # Relationships
    target_class = relationship("Class", foreign_keys=[target_class_id])
    created_by_user = relationship("User", foreign_keys=[created_by])


class SchoolSettings(Base):
    __tablename__ = "school_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    updated_by_user = relationship("User", foreign_keys=[updated_by])
from database import SessionLocal
from models import (
    User, Staff, Student, Parent, ParentStudent,
    Class, Subject, ClassSubject, StaffClockIn,
    StudentAttendance, Assignment, Grade,
    Notice, NoticeComment, Event, SchoolSettings,
    UserRole, AttendanceStatus, NoticeAudience, EventType
)
from auth import hash_password
from datetime import datetime, date, timedelta
import random

db = SessionLocal()

def clear_data():
    print("Clearing existing data...")
    db.query(NoticeComment).delete()
    db.query(Grade).delete()
    db.query(StudentAttendance).delete()
    db.query(StaffClockIn).delete()
    db.query(Assignment).delete()
    db.query(Notice).delete()
    db.query(Event).delete()
    db.query(ParentStudent).delete()
    db.query(ClassSubject).delete()
    db.query(Student).delete()
    db.query(Parent).delete()
    db.query(Class).delete()
    db.query(Staff).delete()
    db.query(Subject).delete()
    db.query(SchoolSettings).delete()
    db.query(User).delete()
    db.commit()
    print("Done.")

def create_school_settings():
    print("Creating school settings...")
    settings = [
        SchoolSettings(
            key="school_name",
            value="St. Andrews High School",
            description="Name of the school"
        ),
        SchoolSettings(
            key="clockin_deadline",
            value="07:30",
            description="Staff late arrival threshold"
        ),
        SchoolSettings(
            key="current_term",
            value="Term 1 2026",
            description="Current academic term"
        ),
        SchoolSettings(
            key="term_start_date",
            value="2026-01-12",
            description="Start of current term"
        ),
        SchoolSettings(
            key="term_end_date",
            value="2026-04-03",
            description="End of current term"
        ),
        SchoolSettings(
            key="school_address",
            value="123 School Road, Harare",
            description="Physical address of the school"
        ),
        SchoolSettings(key="kiosk_code", value="1234"),
    ]
    db.add_all(settings)
    db.commit()
    print(f"Created {len(settings)} school settings.")
    return settings


def create_subjects():
    print("Creating subjects...")
    subjects_data = [
        {"name": "Mathematics", "code": "MATH101"},
        {"name": "English Language", "code": "ENG101"},
        {"name": "Physics", "code": "PHY101"},
        {"name": "Chemistry", "code": "CHEM101"},
        {"name": "Biology", "code": "BIO101"},
        {"name": "History", "code": "HIST101"},
        {"name": "Geography", "code": "GEO101"},
        {"name": "Computer Science", "code": "CS101"},
    ]
    subjects = []
    for s in subjects_data:
        subject = Subject(name=s["name"], code=s["code"])
        db.add(subject)
        subjects.append(subject)
    db.commit()
    print(f"Created {len(subjects)} subjects.")
    return subjects

def create_users_and_staff(subjects):
    print("Creating users and staff...")

    # Super Admin
    super_admin_user = User(
        email="admin@standrews.ac.zw",
        password_hash=hash_password("admin123"),
        role=UserRole.SUPER_ADMIN,
        first_name="System",
        last_name="Administrator",
        phone="+263771000000",
        is_active=True
    )
    db.add(super_admin_user)
    db.commit()

    # Principal
    principal_user = User(
        email="principal@standrews.ac.zw",
        password_hash=hash_password("principal123"),
        role=UserRole.PRINCIPAL,
        first_name="James",
        last_name="Mutasa",
        phone="+263771000001",
        is_active=True
    )
    db.add(principal_user)
    db.commit()

    principal_staff = Staff(
        user_id=principal_user.id,
        employee_number="EMP001",
        department="Administration",
        job_title="Principal",
        hire_date=date(2015, 1, 10),
    )
    db.add(principal_staff)
    db.commit()

    # Teachers
    teachers_data = [
        {
            "email": "t.moyo@standrews.ac.zw",
            "password": "teacher123",
            "first_name": "Tendai",
            "last_name": "Moyo",
            "phone": "+263771000002",
            "employee_number": "EMP002",
            "department": "Mathematics",
            "job_title": "Mathematics Teacher",
            "subject": subjects[0],  # Mathematics
        },
        {
            "email": "s.dube@standrews.ac.zw",
            "password": "teacher123",
            "first_name": "Siyanda",
            "last_name": "Dube",
            "phone": "+263771000003",
            "employee_number": "EMP003",
            "department": "Sciences",
            "job_title": "Physics Teacher",
            "subject": subjects[2],  # Physics
        },
        {
            "email": "r.ncube@standrews.ac.zw",
            "password": "teacher123",
            "first_name": "Rudo",
            "last_name": "Ncube",
            "phone": "+263771000004",
            "employee_number": "EMP004",
            "department": "Languages",
            "job_title": "English Teacher",
            "subject": subjects[1],  # English
        },
        {
            "email": "p.zimba@standrews.ac.zw",
            "password": "teacher123",
            "first_name": "Petros",
            "last_name": "Zimba",
            "phone": "+263771000005",
            "employee_number": "EMP005",
            "department": "Sciences",
            "job_title": "Chemistry Teacher",
            "subject": subjects[3],  # Chemistry
        },
    ]

    teachers = []
    for t in teachers_data:
        user = User(
            email=t["email"],
            password_hash=hash_password(t["password"]),
            role=UserRole.TEACHER,
            first_name=t["first_name"],
            last_name=t["last_name"],
            phone=t["phone"],
            is_active=True
        )
        db.add(user)
        db.commit()

        staff = Staff(
            user_id=user.id,
            employee_number=t["employee_number"],
            department=t["department"],
            job_title=t["job_title"],
            hire_date=date(2020, 1, 10),
            primary_subject_id=t["subject"].id
        )
        db.add(staff)
        db.commit()
        teachers.append({"user": user, "staff": staff})

    print(f"Created 1 super admin, 1 principal and {len(teachers)} teachers.")
    return super_admin_user, principal_user, principal_staff, teachers

def create_classes_and_students(teachers):
    print("Creating classes and students...")

    # Classes
    class_10a = Class(
        name="10A",
        grade_level="Grade 10",
        academic_year="2025/2026",
        homeroom_teacher_id=teachers[0]["staff"].id  # Tendai Moyo
    )
    class_10b = Class(
        name="10B",
        grade_level="Grade 10",
        academic_year="2025/2026",
        homeroom_teacher_id=teachers[1]["staff"].id  # Siyanda Dube
    )
    db.add_all([class_10a, class_10b])
    db.commit()

    # Students data
    students_data = [
        # Class 10A students
        {
            "email": "takoda.moyo@student.standrews.ac.zw",
            "first_name": "Takoda",
            "last_name": "Moyo",
            "student_number": "STU001",
            "dob": date(2009, 3, 15),
            "class": class_10a
        },
        {
            "email": "amara.dube@student.standrews.ac.zw",
            "first_name": "Amara",
            "last_name": "Dube",
            "student_number": "STU002",
            "dob": date(2009, 7, 22),
            "class": class_10a
        },
        {
            "email": "chidi.ncube@student.standrews.ac.zw",
            "first_name": "Chidi",
            "last_name": "Ncube",
            "student_number": "STU003",
            "dob": date(2009, 11, 5),
            "class": class_10a
        },
        {
            "email": "zola.zimba@student.standrews.ac.zw",
            "first_name": "Zola",
            "last_name": "Zimba",
            "student_number": "STU004",
            "dob": date(2009, 1, 30),
            "class": class_10a
        },
        # Class 10B students
        {
            "email": "tendo.mutasa@student.standrews.ac.zw",
            "first_name": "Tendo",
            "last_name": "Mutasa",
            "student_number": "STU005",
            "dob": date(2009, 5, 18),
            "class": class_10b
        },
        {
            "email": "nia.moyo@student.standrews.ac.zw",
            "first_name": "Nia",
            "last_name": "Moyo",
            "student_number": "STU006",
            "dob": date(2009, 9, 12),
            "class": class_10b
        },
        {
            "email": "kofi.dube@student.standrews.ac.zw",
            "first_name": "Kofi",
            "last_name": "Dube",
            "student_number": "STU007",
            "dob": date(2009, 4, 25),
            "class": class_10b
        },
        {
            "email": "sade.ncube@student.standrews.ac.zw",
            "first_name": "Sade",
            "last_name": "Ncube",
            "student_number": "STU008",
            "dob": date(2009, 8, 8),
            "class": class_10b
        },
    ]

    students = []
    for s in students_data:
        user = User(
            email=s["email"],
            password_hash=hash_password("student123"),
            role=UserRole.STUDENT,
            first_name=s["first_name"],
            last_name=s["last_name"],
            is_active=True
        )
        db.add(user)
        db.commit()

        student = Student(
            user_id=user.id,
            student_number=s["student_number"],
            date_of_birth=s["dob"],
            grade_level="Grade 10",
            class_id=s["class"].id
        )
        db.add(student)
        db.commit()
        students.append({"user": user, "student": student, "class": s["class"]})

    print(f"Created 2 classes and {len(students)} students.")
    return class_10a, class_10b, students

def create_parents(students):
    print("Creating parents...")

    parents_data = [
        {
            "email": "mr.moyo@gmail.com",
            "first_name": "Tafadzwa",
            "last_name": "Moyo",
            "phone": "+263771100001",
            "whatsapp": "+263771100001",
            "relationship": "Father",
            "children": [students[0], students[5]]  # Takoda and Nia
        },
        {
            "email": "mrs.dube@gmail.com",
            "first_name": "Thandiwe",
            "last_name": "Dube",
            "phone": "+263771100002",
            "whatsapp": "+263771100002",
            "relationship": "Mother",
            "children": [students[1], students[6]]  # Amara and Kofi
        },
        {
            "email": "mr.ncube@gmail.com",
            "first_name": "Nkosi",
            "last_name": "Ncube",
            "phone": "+263771100003",
            "whatsapp": "+263771100003",
            "relationship": "Father",
            "children": [students[2], students[7]]  # Chidi and Sade
        },
        {
            "email": "mrs.zimba@gmail.com",
            "first_name": "Ruvimbo",
            "last_name": "Zimba",
            "phone": "+263771100004",
            "whatsapp": "+263771100004",
            "relationship": "Mother",
            "children": [students[3], students[4]]  # Zola and Tendo
        },
    ]

    parents = []
    for p in parents_data:
        user = User(
            email=p["email"],
            password_hash=hash_password("parent123"),
            role=UserRole.PARENT,
            first_name=p["first_name"],
            last_name=p["last_name"],
            phone=p["phone"],
            is_active=True
        )
        db.add(user)
        db.commit()

        parent = Parent(
            user_id=user.id,
            whatsapp_number=p["whatsapp"]
        )
        db.add(parent)
        db.commit()

        # Link parent to their children
        for child in p["children"]:
            association = ParentStudent(
                parent_id=parent.id,
                student_id=child["student"].id,
                relationship_type=p["relationship"]
            )
            db.add(association)
        db.commit()
        parents.append({"user": user, "parent": parent})

    print(f"Created {len(parents)} parents.")
    return parents


def create_class_subjects(teachers, class_10a, class_10b, subjects):
    print("Creating class subjects...")

    class_subjects_data = [
        # 10A subjects
        {"class": class_10a, "subject": subjects[0], "teacher": teachers[0]["staff"]},  # Maths - Tendai
        {"class": class_10a, "subject": subjects[1], "teacher": teachers[2]["staff"]},  # English - Rudo
        {"class": class_10a, "subject": subjects[2], "teacher": teachers[1]["staff"]},  # Physics - Siyanda
        {"class": class_10a, "subject": subjects[3], "teacher": teachers[3]["staff"]},  # Chemistry - Petros
        # 10B subjects
        {"class": class_10b, "subject": subjects[0], "teacher": teachers[0]["staff"]},  # Maths - Tendai
        {"class": class_10b, "subject": subjects[1], "teacher": teachers[2]["staff"]},  # English - Rudo
        {"class": class_10b, "subject": subjects[2], "teacher": teachers[1]["staff"]},  # Physics - Siyanda
        {"class": class_10b, "subject": subjects[3], "teacher": teachers[3]["staff"]},  # Chemistry - Petros
    ]

    class_subjects = []
    for cs in class_subjects_data:
        class_subject = ClassSubject(
            class_id=cs["class"].id,
            subject_id=cs["subject"].id,
            teacher_id=cs["teacher"].id,
            academic_year="2025/2026"
        )
        db.add(class_subject)
        class_subjects.append(class_subject)
    db.commit()

    print(f"Created {len(class_subjects)} class subjects.")
    return class_subjects


def create_clock_ins(teachers, principal_staff):
    print("Creating staff clock in records...")

    # Generate clock in records for the past 5 days
    today = date.today()
    all_staff = [{"staff": principal_staff}] + teachers

    for day_offset in range(5):
        current_date = today - timedelta(days=day_offset)

        # Skip weekends
        if current_date.weekday() >= 5:
            continue

        for staff_member in all_staff:
            staff = staff_member["staff"] if "staff" in staff_member else staff_member

            # Randomly assign clock in times — mostly on time, occasionally late
            is_late = random.random() < 0.2  # 20% chance of being late
            if is_late:
                hour = 7
                minute = random.randint(31, 55)
                flag_reason = f"Arrived late - 07:{minute}am"
            else:
                hour = 7
                minute = random.randint(0, 29)
                flag_reason = None

            clock_in = StaffClockIn(
                staff_id=staff.id,
                date=current_date,
                clock_in_time=datetime.combine(current_date, datetime.min.time().replace(hour=hour, minute=minute)),
                clock_out_time=datetime.combine(current_date, datetime.min.time().replace(hour=16, minute=random.randint(0, 30))),
                flagged=is_late,
                flag_reason=flag_reason
            )
            db.add(clock_in)

    db.commit()
    print("Created clock in records for past 5 working days.")

def create_assignments_and_grades(class_subjects, students):
    print("Creating assignments and grades...")

    today = date.today()

    # Create assignments for each class subject
    assignments_data = [
        {
            "class_subject": class_subjects[0],  # 10A Maths
            "title": "Algebra Quiz 1",
            "description": "Solve the following algebraic equations showing all working.",
            "due_date": today - timedelta(days=7),
            "max_marks": 50,
        },
        {
            "class_subject": class_subjects[0],  # 10A Maths
            "title": "Geometry Homework",
            "description": "Complete exercises 3.1 to 3.5 from the textbook.",
            "due_date": today + timedelta(days=3),
            "max_marks": 30,
        },
        {
            "class_subject": class_subjects[1],  # 10A English
            "title": "Essay — My Community",
            "description": "Write a 500 word essay describing your community and its importance to you.",
            "due_date": today - timedelta(days=3),
            "max_marks": 100,
        },
        {
            "class_subject": class_subjects[2],  # 10A Physics
            "title": "Forces and Motion Test",
            "description": "Test covering Newton's three laws of motion.",
            "due_date": today - timedelta(days=10),
            "max_marks": 80,
        },
        {
            "class_subject": class_subjects[4],  # 10B Maths
            "title": "Algebra Quiz 1",
            "description": "Solve the following algebraic equations showing all working.",
            "due_date": today - timedelta(days=7),
            "max_marks": 50,
        },
        {
            "class_subject": class_subjects[5],  # 10B English
            "title": "Essay — My Community",
            "description": "Write a 500 word essay describing your community and its importance to you.",
            "due_date": today - timedelta(days=3),
            "max_marks": 100,
        },
        {
            "class_subject": class_subjects[6],  # 10B Physics
            "title": "Forces and Motion Test",
            "description": "Test covering Newton's three laws of motion.",
            "due_date": today - timedelta(days=10),
            "max_marks": 80,
        },
        {
            "class_subject": class_subjects[7],  # 10B Chemistry
            "title": "Periodic Table Assignment",
            "description": "Label the periodic table and answer the questions on page 45.",
            "due_date": today + timedelta(days=5),
            "max_marks": 40,
        },
    ]

    assignments = []
    for a in assignments_data:
        assignment = Assignment(
            class_subject_id=a["class_subject"].id,
            title=a["title"],
            description=a["description"],
            due_date=a["due_date"],
            max_marks=a["max_marks"],
            created_by=a["class_subject"].teacher_id,
            is_published=True
        )
        db.add(assignment)
        db.commit()
        assignments.append(assignment)

    # Create grades for past assignments only (due date has passed)
    past_assignments = [a for a in assignments if a.due_date < today]

    for assignment in past_assignments:
        # Get students in the relevant class
        class_students = [
            s for s in students
            if s["class"].id == assignment.class_subject.class_id
        ]
        for s in class_students:
            marks = round(random.uniform(40, assignment.max_marks), 1)
            grade = Grade(
                assignment_id=assignment.id,
                student_id=s["student"].id,
                marks_awarded=marks,
                feedback=random.choice([
                    "Good effort, keep it up.",
                    "Needs improvement in key areas.",
                    "Excellent work, well done.",
                    "Please review the sections we covered in class.",
                    "Strong performance, minor errors only.",
                ]),
                graded_by=assignment.class_subject.teacher_id,
                graded_at=datetime.utcnow(),
                is_released=True
            )
            db.add(grade)

    db.commit()
    print(f"Created {len(assignments)} assignments and grades for past assignments.")
    return assignments

def create_attendance(students, teachers):
    print("Creating student attendance records...")

    today = date.today()

    for day_offset in range(5):
        current_date = today - timedelta(days=day_offset)

        if current_date.weekday() >= 5:
            continue

        for s in students:
            # Determine which teacher recorded attendance
            teacher = teachers[0] if s["class"].name == "10A" else teachers[1]

            # 85% present, 10% absent, 5% late
            rand = random.random()
            if rand < 0.85:
                attendance_status = AttendanceStatus.PRESENT
                notes = None
            elif rand < 0.95:
                attendance_status = AttendanceStatus.ABSENT
                notes = random.choice([
                    "Parent called in sick",
                    "No reason provided",
                    "Medical appointment",
                ])
            else:
                attendance_status = AttendanceStatus.LATE
                notes = "Arrived after register was taken"

            attendance = StudentAttendance(
                student_id=s["student"].id,
                class_id=s["class"].id,
                date=current_date,
                status=attendance_status,
                recorded_by=teacher["staff"].id,
                notes=notes,
                recorded_at=datetime.utcnow()
            )
            db.add(attendance)

    db.commit()
    print("Created student attendance records for past 5 working days.")


def create_notices_and_events(principal_user, teachers):
    print("Creating notices and events...")

    notices = [
        Notice(
            created_by=principal_user.id,
            title="Welcome Back for Term 1 2026",
            body="Dear students and parents, welcome back to St. Andrews High School. "
                 "We look forward to a productive and exciting term ahead. "
                 "Please ensure all fees are paid by the end of January.",
            audience=NoticeAudience.ALL,
            is_pinned=True,
            created_at=datetime.utcnow()
        ),
        Notice(
            created_by=principal_user.id,
            title="Exam Timetable — End of Term",
            body="The end of term examination timetable has been released. "
                 "Please check the school notice board for your individual subject times. "
                 "All students must be present for all examinations.",
            audience=NoticeAudience.STUDENTS,
            is_pinned=True,
            created_at=datetime.utcnow()
        ),
        Notice(
            created_by=principal_user.id,
            title="Staff Development Day — Friday",
            body="Please note that this Friday has been designated as a staff development day. "
                 "All teachers are required to attend the workshop in the school hall at 8am. "
                 "Students will not be required to attend school on this day.",
            audience=NoticeAudience.TEACHERS,
            is_pinned=False,
            created_at=datetime.utcnow()
        ),
        Notice(
            created_by=teachers[0]["user"].id,
            title="Grade 10A — Mathematics Catch Up Session",
            body="There will be a Mathematics catch up session this Thursday after school "
                 "from 3pm to 4:30pm in Room 12. All Grade 10A students are encouraged to attend.",
            audience=NoticeAudience.CLASS,
            target_class_id=None,
            is_pinned=False,
            created_at=datetime.utcnow()
        ),
        Notice(
            created_by=principal_user.id,
            title="School Fees Reminder",
            body="This is a reminder that Term 1 school fees are due by the 31st of January. "
                 "Please contact the school bursar if you require a payment plan.",
            audience=NoticeAudience.PARENTS,
            is_pinned=False,
            created_at=datetime.utcnow()
        ),
    ]

    db.add_all(notices)
    db.commit()

    events = [
        Event(
            title="Inter-House Athletics Day",
            description="Annual inter-house athletics competition. All students are encouraged "
                         "to participate and support their houses.",
            event_type=EventType.SPORTS,
            location="Main Sports Field",
            start_datetime=datetime.utcnow() + timedelta(days=14),
            end_datetime=datetime.utcnow() + timedelta(days=14, hours=6),
            audience=NoticeAudience.ALL,
            created_by=principal_user.id,
            is_cancelled=False
        ),
        Event(
            title="Grade 10 Parent Teacher Meeting",
            description="Parents of Grade 10 students are invited to meet with subject teachers "
                         "to discuss academic progress for the term.",
            event_type=EventType.MEETING,
            location="School Hall",
            start_datetime=datetime.utcnow() + timedelta(days=7),
            end_datetime=datetime.utcnow() + timedelta(days=7, hours=3),
            audience=NoticeAudience.PARENTS,
            created_by=principal_user.id,
            is_cancelled=False
        ),
        Event(
            title="Mathematics Olympiad",
            description="The annual Mathematics Olympiad is open to all Grade 10 and 11 students. "
                         "Speak to your Mathematics teacher to register.",
            event_type=EventType.ACADEMIC,
            location="Room 12",
            start_datetime=datetime.utcnow() + timedelta(days=21),
            end_datetime=datetime.utcnow() + timedelta(days=21, hours=2),
            audience=NoticeAudience.STUDENTS,
            created_by=teachers[0]["user"].id,
            is_cancelled=False
        ),
        Event(
            title="End of Term Prize Giving",
            description="Join us to celebrate the achievements of our students at the "
                         "end of term prize giving ceremony.",
            event_type=EventType.CULTURAL,
            location="School Hall",
            start_datetime=datetime.utcnow() + timedelta(days=60),
            end_datetime=datetime.utcnow() + timedelta(days=60, hours=4),
            audience=NoticeAudience.ALL,
            created_by=principal_user.id,
            is_cancelled=False
        ),
    ]

    db.add_all(events)
    db.commit()
    print(f"Created {len(notices)} notices and {len(events)} events.")


# --- Main run function ---
def seed():
    try:
        clear_data()
        settings = create_school_settings()
        subjects = create_subjects()
        super_admin_user, principal_user, principal_staff, teachers = create_users_and_staff(subjects)
        class_10a, class_10b, students = create_classes_and_students(teachers)
        create_parents(students)
        class_subjects = create_class_subjects(teachers, class_10a, class_10b, subjects)
        create_clock_ins(teachers, principal_staff)
        assignments = create_assignments_and_grades(class_subjects, students)
        create_attendance(students, teachers)
        create_notices_and_events(principal_user, teachers)

        print("\n[SUCCESS] Database seeded successfully!")
        print("\n--- Login Credentials ---")
        print("Super Admin  : admin@standrews.ac.zw        / admin123")
        print("Principal    : principal@standrews.ac.zw    / principal123")
        print("Teacher 1    : t.moyo@standrews.ac.zw       / teacher123")
        print("Teacher 2    : s.dube@standrews.ac.zw       / teacher123")
        print("Teacher 3    : r.ncube@standrews.ac.zw      / teacher123")
        print("Teacher 4    : p.zimba@standrews.ac.zw      / teacher123")
        print("Student 1    : takoda.moyo@student...       / student123")
        print("Parent 1     : mr.moyo@gmail.com            / parent123")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()

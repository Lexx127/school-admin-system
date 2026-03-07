from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, Notice, NoticeComment, Event,
    NoticeAudience, EventType, UserRole, Class
)
from auth import require_role
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/notices", tags=["notices"])


# --- Pydantic Schemas ---
class NoticeCreate(BaseModel):
    title: str
    body: str
    audience: NoticeAudience
    target_class_id: Optional[int] = None
    is_pinned: bool = False


class CommentCreate(BaseModel):
    body: str


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: EventType
    location: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    audience: NoticeAudience
    target_class_id: Optional[int] = None


# --- Create Notice (Teacher/Principal) ---
@router.post("/create")
def create_notice(
    request: NoticeCreate,
    current_user: User = Depends(require_role(
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
    )),
    db: Session = Depends(get_db)
):
    # Teachers can only post to their own class
    if current_user.role == UserRole.TEACHER:  # type: ignore
        if request.audience not in [NoticeAudience.CLASS, NoticeAudience.ALL]:  # type: ignore
            raise HTTPException(
                status_code=403,
                detail="Teachers can only post notices to their class or all"
            )

    notice = Notice(
        created_by=current_user.id,
        title=request.title,
        body=request.body,
        audience=request.audience,
        target_class_id=request.target_class_id,
        is_pinned=request.is_pinned,
        created_at=datetime.utcnow()
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    return {
        "message": "Notice created successfully",
        "notice_id": notice.id,
        "title": notice.title,
        "audience": notice.audience
    }


# --- Get Notices For Current User ---
@router.get("/mine")
def get_my_notices(
    current_user: User = Depends(require_role(
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN,
        UserRole.STUDENT, UserRole.PARENT
    )),
    db: Session = Depends(get_db)
):
    from models import Staff, Student, Parent

    all_notices = db.query(Notice).order_by(
        Notice.is_pinned.desc(),
        Notice.created_at.desc()
    ).all()

    # Get user's class id if student or parent
    user_class_id = None

    if current_user.role == UserRole.STUDENT:  # type: ignore
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            user_class_id = student.class_id

    elif current_user.role == UserRole.PARENT:  # type: ignore
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if parent and parent.student_associations:
            user_class_id = [
                assoc.student.class_id 
                for assoc in parent.student_associations
            ]

    elif current_user.role == UserRole.TEACHER:  # type: ignore
        staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if staff and staff.homeroom_class:
            user_class_id = staff.homeroom_class.id  # type: ignore

    # Filter notices by audience
    visible_notices = []
    for n in all_notices:
        if n.audience == NoticeAudience.ALL:  # type: ignore
            visible_notices.append(n)
        elif n.audience == NoticeAudience.TEACHERS and current_user.role in [  # type: ignore
            UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
        ]:
            visible_notices.append(n)
        elif n.audience == NoticeAudience.STUDENTS and current_user.role == UserRole.STUDENT:  # type: ignore
            visible_notices.append(n)
        elif n.audience == NoticeAudience.PARENTS and current_user.role == UserRole.PARENT:  # type: ignore
            visible_notices.append(n)
        elif n.audience == NoticeAudience.CLASS:  # type: ignore
            check_ids = user_class_id if isinstance(user_class_id, list) else [user_class_id]
            if n.target_class_id in check_ids:
                visible_notices.append(n)

    result = []
    for n in visible_notices:
        result.append({
            "notice_id": n.id,
            "title": n.title,
            "body": n.body,
            "audience": n.audience,
            "is_pinned": n.is_pinned,
            "created_at": n.created_at,
            "created_by": f"{n.created_by_user.first_name} {n.created_by_user.last_name}",
            "comment_count": len(n.comments)
        })

    return result


# --- Pin or Unpin a Notice (Principal only) ---
@router.put("/pin/{notice_id}")
def toggle_pin(
    notice_id: int,
    current_user: User = Depends(require_role(UserRole.PRINCIPAL, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    notice.is_pinned = not notice.is_pinned  # type: ignore
    db.commit()

    return {
        "message": f"Notice {'pinned' if notice.is_pinned else 'unpinned'} successfully" # type: ignore
    }


# --- Add Comment to Notice ---
@router.post("/comment/{notice_id}")
def add_comment(
    notice_id: int,
    request: CommentCreate,
    current_user: User = Depends(require_role(
        UserRole.STUDENT, UserRole.PARENT,
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
    )),
    db: Session = Depends(get_db)
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    comment = NoticeComment(
        notice_id=notice_id,
        author_id=current_user.id,
        body=request.body,
        created_at=datetime.utcnow()
    )
    db.add(comment)
    db.commit()

    return {"message": "Comment added successfully"}


# --- Get Comments for a Notice ---
@router.get("/comments/{notice_id}")
def get_comments(
    notice_id: int,
    current_user: User = Depends(require_role(
        UserRole.STUDENT, UserRole.PARENT,
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
    )),
    db: Session = Depends(get_db)
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    return [
        {
            "comment_id": c.id,
            "author": f"{c.author.first_name} {c.author.last_name}",
            "author_role": c.author.role,
            "body": c.body,
            "created_at": c.created_at
        }
        for c in notice.comments
    ]


# --- Create Event (Teacher/Principal) ---
@router.post("/events/create")
def create_event(
    request: EventCreate,
    current_user: User = Depends(require_role(
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
    )),
    db: Session = Depends(get_db)
):
    event = Event(
        title=request.title,
        description=request.description,
        event_type=request.event_type,
        location=request.location,
        start_datetime=request.start_datetime,
        end_datetime=request.end_datetime,
        audience=request.audience,
        target_class_id=request.target_class_id,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        is_cancelled=False
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "message": "Event created successfully",
        "event_id": event.id,
        "title": event.title,
        "start_datetime": event.start_datetime
    }


# --- Get Upcoming Events ---
@router.get("/events/upcoming")
def get_upcoming_events(
    current_user: User = Depends(require_role(
        UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN,
        UserRole.STUDENT, UserRole.PARENT
    )),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    events = db.query(Event).filter(
        Event.start_datetime >= now,
        Event.is_cancelled == False  # noqa: E712
    ).order_by(Event.start_datetime.asc()).all()

    result = []
    for e in events:
        # Filter by audience
        show = False
        if e.audience == NoticeAudience.ALL:  # type: ignore
            show = True
        elif e.audience == NoticeAudience.TEACHERS and current_user.role in [  # type: ignore
            UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN
        ]:
            show = True
        elif e.audience == NoticeAudience.STUDENTS and current_user.role == UserRole.STUDENT:  # type: ignore
            show = True
        elif e.audience == NoticeAudience.PARENTS and current_user.role == UserRole.PARENT:  # type: ignore
            show = True
        elif e.audience == NoticeAudience.CLASS:  # type: ignore
            from models import Student, Parent
            if current_user.role == UserRole.STUDENT:  # type: ignore
                student = db.query(Student).filter(Student.user_id == current_user.id).first()
                if student and student.class_id == e.target_class_id: # type: ignore
                    show = True
            elif current_user.role == UserRole.PARENT:  # type: ignore
                parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
                if parent:
                    class_ids = [a.student.class_id for a in parent.student_associations]
                    if e.target_class_id in class_ids:
                        show = True
            elif current_user.role in [UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN]:  # type: ignore
                show = True

        if show:
            result.append({
                "event_id": e.id,
                "title": e.title,
                "description": e.description,
                "event_type": e.event_type,
                "location": e.location,
                "start_datetime": e.start_datetime,
                "end_datetime": e.end_datetime,
                "audience": e.audience,
                "created_by": f"{e.created_by_user.first_name} {e.created_by_user.last_name}"
            })

    return result
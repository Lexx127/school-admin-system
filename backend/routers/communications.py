from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Message, User, UserRole
from auth import get_current_user, require_role
from schemas import MessageCreate, MessageResponse

router = APIRouter(prefix="/communications", tags=["communications"])

@router.post("/send", response_model=MessageResponse)
def send_message(
    msg: MessageCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.PARENT)),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.id == msg.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    new_msg = Message(
        sender_id=current_user.id,
        receiver_id=msg.receiver_id,
        subject=msg.subject,
        body=msg.body
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("/inbox", response_model=List[MessageResponse])
def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(Message.receiver_id == current_user.id).order_by(Message.sent_at.desc()).all()
    return messages

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SchoolSettings, User, UserRole
from auth import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingUpdate(BaseModel):
    value: str

@router.get("/")
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(SchoolSettings).all()
    return {s.key: s.value for s in settings}

@router.put("/{key}")
def update_setting(key: str, request: SettingUpdate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)), db: Session = Depends(get_db)):
    setting = db.query(SchoolSettings).filter(SchoolSettings.key == key).first()
    if not setting:
        setting = SchoolSettings(key=key, value=request.value)
        db.add(setting)
    else:
        setting.value = request.value
    db.commit()
    return {"message": f"Setting {key} updated"}

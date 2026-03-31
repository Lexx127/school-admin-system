from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, SchoolTerm, SchoolCalendarDay, DayType, UserRole
from auth import require_role
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter(prefix="/calendar", tags=["calendar"])

class TermCreate(BaseModel):
    name: str # e.g. "Term 1"
    academic_year: str # e.g. "2025"
    start_date: date
    end_date: date
    cycle_length: int = 6
    starting_cycle_day: int = 1

class DayUpdate(BaseModel):
    day_type: str
    note: Optional[str] = None

def recalculate_term_cycle(term_id: int, cycle_length: int, starting_cycle_day: int, db: Session):
    days = db.query(SchoolCalendarDay).filter(SchoolCalendarDay.term_id == term_id).order_by(SchoolCalendarDay.date).all()
    
    current_cycle = starting_cycle_day
    for d in days:
        if d.day_type == DayType.SCHOOL_DAY:
            d.cycle_day = current_cycle
            current_cycle = (current_cycle % cycle_length) + 1
        else:
            d.cycle_day = None

@router.post("/terms")
def create_term(request: TermCreate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    if request.start_date > request.end_date:
        raise HTTPException(400, "Start date must be before end date")
    
    term = SchoolTerm(
        name=request.name,
        academic_year=request.academic_year,
        start_date=request.start_date,
        end_date=request.end_date
    )
    db.add(term)
    db.flush() # flush to get term.id
    
    # Generate days
    current_date = request.start_date
    current_cycle = request.starting_cycle_day
    
    while current_date <= request.end_date:
        is_weekend = current_date.weekday() >= 5
        day_type = DayType.SCHOOL_HOLIDAY if is_weekend else DayType.SCHOOL_DAY
        
        cycle_day = None
        if not is_weekend:
            cycle_day = current_cycle
            current_cycle = (current_cycle % request.cycle_length) + 1
            
        calendar_day = SchoolCalendarDay(
            date=current_date,
            day_type=day_type,
            cycle_day=cycle_day,
            note="Weekend" if is_weekend else None,
            term_id=term.id,
            created_by=current_user.id
        )
        db.add(calendar_day)
        current_date += timedelta(days=1)
        
    db.commit()
    return {"message": "Term and calendar days created", "term_id": term.id}

@router.get("/terms")
def get_terms(current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)), db: Session = Depends(get_db)):
    terms = db.query(SchoolTerm).order_by(SchoolTerm.start_date).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "academic_year": t.academic_year,
            "start_date": t.start_date.isoformat(),
            "end_date": t.end_date.isoformat()
        } for t in terms
    ]

@router.get("/days/{term_id}")
def get_term_days(term_id: int, db: Session = Depends(get_db)):
    days = db.query(SchoolCalendarDay).filter(SchoolCalendarDay.term_id == term_id).order_by(SchoolCalendarDay.date).all()
    return [
        {
            "id": d.id,
            "date": d.date.isoformat(),
            "day_type": d.day_type,
            "cycle_day": d.cycle_day,
            "note": d.note
        } for d in days
    ]

@router.put("/days/{date_str}")
def update_calendar_day(date_str: str, request: DayUpdate, current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PRINCIPAL)), db: Session = Depends(get_db)):
    day = db.query(SchoolCalendarDay).filter(SchoolCalendarDay.date == date.fromisoformat(date_str)).first()
    if not day:
        raise HTTPException(404, "Calendar day not found")
        
    day.day_type = DayType(request.day_type)
    day.note = request.note
    
    if request.day_type != DayType.SCHOOL_DAY:
        day.cycle_day = None
        
    # Recalculate cycle for the term
    if day.term_id:
        recalculate_term_cycle(day.term_id, 6, 1, db) # Assuming default cycle_length 6 and starting 1
        
    db.commit()
    return {"message": "Calendar day updated"}

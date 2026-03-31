from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel
import os
from routers import users, attendance, homework, grades, notices, fees, communications, classes, calendar, enrolments, exports, settings, timetable

app = FastAPI(title="School Admin System")

# CORS middleware — allows Next.js frontend to talk to FastAPI backend
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(attendance.router)
app.include_router(homework.router)
app.include_router(grades.router)
app.include_router(notices.router)
app.include_router(fees.router)
app.include_router(communications.router)
app.include_router(classes.router)
app.include_router(calendar.router)
app.include_router(enrolments.router)
app.include_router(exports.router)
app.include_router(exports.attendance_export_router)
app.include_router(settings.router)
app.include_router(timetable.router)

# --- Pydantic Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str

    class Config:
        from_attributes = True

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# --- Routes ---
@app.get("/")
def root():
    return {"message": "School Admin System API is running"}

@app.post("/auth/login")
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated"
        )
    # Create JWT token
    token = create_access_token({"sub": str(user.id), "role": user.role})

    # Set token as HttpOnly cookie
    cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        samesite=cookie_samesite,
        secure=cookie_secure
    )
    return {"message": "Login successful", "role": user.role}

@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/auth/change-password")
def change_password(request: PasswordChangeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel
import os
from routers import users, attendance, homework, grades, notices, fees, communications

app = FastAPI(title="School Admin System")

# CORS middleware — allows Next.js frontend to talk to FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    return {"message": "Login successful", "role": user.role}

@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
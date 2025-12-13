"""
Authentication Routes - MongoDB Version
Login, Register, Token Management
"""
from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from auth import AuthToken, Users, PasswordManager
from typing import Optional
from database import get_users_collection
from datetime import datetime
from email_service import email_service
from email_validator import email_validator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    role: str

class UserInfo(BaseModel):
    username: str
    email: str
    role: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register new user with email confirmation"""
    try:
        users_col = get_users_collection()
        
        # Step 1: Validate email format and domain
        is_valid, error_msg = email_validator.validate_email(
            request.email,
            check_mx=True,
            require_gmail=True  # Require Gmail
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Step 2: Check if username exists
        if users_col.find_one({"username": request.username}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Step 3: Check if email exists
        if users_col.find_one({"email": request.email.lower()}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Step 4: Hash password
        hashed_password = PasswordManager.hash_password(request.password)
        
        # Step 5: Create user
        user_doc = {
            "username": request.username,
            "email": request.email.lower(),
            "password_hash": hashed_password,
            "role": "user",
            "is_active": True,
            "email_verified": False,  # Email not verified yet
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = users_col.insert_one(user_doc)
        
        # Step 6: Send confirmation email
        email_sent = email_service.send_registration_confirmation(
            user_email=request.email.lower(),
            username=request.username
        )
        
        if not email_sent:
            logger.warning(f"Failed to send confirmation email to {request.email}")
        
        return {
            "success": True,
            "username": request.username,
            "email": request.email.lower(),
            "email_sent": email_sent,
            "message": f"✅ Registration successful! Confirmation email sent to {request.email}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login and get access token"""
    user = Users.authenticate(request.username, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = AuthToken.create_access_token(
        data={"sub": request.username, "role": user["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "role": user["role"]
    }

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user info from token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header"
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = AuthToken.verify_token(token)
        return {
            "username": payload["username"],
            "role": payload["role"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset - sends email with reset link"""
    try:
        users_col = get_users_collection()
        
        # Find user by email
        user = users_col.find_one({"email": request.email.lower()})
        if not user:
            # Don't reveal if email exists for security
            return {
                "success": True,
                "message": "If email exists, password reset link has been sent"
            }
        
        # Generate reset token (valid for 24 hours)
        reset_token = AuthToken.create_access_token(
            data={"sub": user["username"], "type": "password_reset"},
            expires_delta_hours=24
        )
        
        # Store reset token in user document
        users_col.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_token": reset_token,
                "reset_token_created": datetime.utcnow()
            }}
        )
        
        # Send reset email
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
        email_service.send_password_reset(
            user_email=user["email"],
            username=user["username"],
            reset_link=reset_link
        )
        
        return {
            "success": True,
            "message": "If email exists, password reset link has been sent"
        }
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return {
            "success": True,
            "message": "If email exists, password reset link has been sent"
        }

@router.post("/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token from email"""
    try:
        # Verify reset token
        payload = AuthToken.verify_token(request.token)
        
        if payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        users_col = get_users_collection()
        username = payload.get("sub")
        
        # Find user
        user = users_col.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if token matches stored token
        if user.get("reset_token") != request.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Hash new password
        hashed_password = PasswordManager.hash_password(request.new_password)
        
        # Update password and clear reset token
        users_col.update_one(
            {"username": username},
            {"$set": {
                "password_hash": hashed_password,
                "reset_token": None,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {
            "success": True,
            "message": "Password reset successfully! Please login with your new password"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

@router.get("/users")
async def list_demo_users():
    """List available demo users (for testing)"""
    users = []
    for username, data in Users.DEMO_USERS.items():
        users.append({
            "username": username,
            "password": data["password"],
            "role": data["role"],
            "email": data["email"]
        })
    return users

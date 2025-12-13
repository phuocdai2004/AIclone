"""
User Management Routes - MongoDB Version
Superadmin Only
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from database import get_users_collection
from schemas import UserCreate, UserResponse
from auth import AuthToken, PasswordManager, Users
from bson import ObjectId
from datetime import datetime
from email_service import email_service
from email_validator import email_validator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

# Verify superadmin access
async def verify_superadmin(authorization: Optional[str] = Header(None)):
    """Verify superadmin role"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization[7:]
    token_data = AuthToken.verify_token(token)
    
    if not Users.is_superadmin(token_data.get("role")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    
    return token_data

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    admin_check: dict = Depends(verify_superadmin)
):
    """Create new user (Superadmin only)"""
    try:
        users_col = get_users_collection()
        
        # Validate email format and domain (require Gmail)
        is_valid, error_msg = email_validator.validate_email(
            user_data.email,
            check_mx=True,
            require_gmail=True
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Check if user already exists
        existing_user = users_col.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        existing_email = users_col.find_one({"email": user_data.email.lower()})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        
        # Hash password
        hashed_password = PasswordManager.hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "username": user_data.username,
            "email": user_data.email.lower(),
            "password_hash": hashed_password,
            "role": user_data.role or "user",
            "is_active": True,
            "email_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = users_col.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        
        # Send registration confirmation email
        email_sent = email_service.send_registration_confirmation(
            user_email=user_data.email.lower(),
            username=user_data.username
        )
        
        if not email_sent:
            logger.warning(f"Failed to send confirmation email to {user_data.email}")
        
        return {
            "username": user_doc["username"],
            "email": user_doc["email"],
            "role": user_doc["role"],
            "is_active": user_doc["is_active"],
            "created_at": user_doc["created_at"],
            "email_sent": email_sent,
            "message": f"User created successfully. Confirmation email sent to {user_data.email}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.get("/", response_model=List[dict])
async def list_users(admin_check: dict = Depends(verify_superadmin)):
    """List all users (Superadmin only)"""
    try:
        users_col = get_users_collection()
        users = list(users_col.find({}, {"password_hash": 0}))
        
        result = []
        for user in users:
            result.append({
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "is_active": user["is_active"],
                "created_at": user["created_at"]
            })
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    admin_check: dict = Depends(verify_superadmin)
):
    """Get user by ID (Superadmin only)"""
    try:
        users_col = get_users_collection()
        user = users_col.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user["is_active"],
            "created_at": user["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    user_data: UserCreate,
    admin_check: dict = Depends(verify_superadmin)
):
    """Update user (Superadmin only)"""
    try:
        users_col = get_users_collection()
        
        # Get existing user
        existing_user = users_col.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check username uniqueness
        if user_data.username != existing_user["username"]:
            dup_user = users_col.find_one({"username": user_data.username})
            if dup_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
        
        # Check email uniqueness
        if user_data.email != existing_user["email"]:
            dup_email = users_col.find_one({"email": user_data.email})
            if dup_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
        
        # Prepare update
        update_data = {
            "username": user_data.username,
            "email": user_data.email,
            "role": user_data.role or existing_user["role"],
            "updated_at": datetime.utcnow()
        }
        
        if user_data.password:
            update_data["password_hash"] = PasswordManager.hash_password(user_data.password)
        
        result = users_col.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_data},
            return_document=True
        )
        
        return {
            "id": str(result["_id"]),
            "username": result["username"],
            "email": result["email"],
            "role": result["role"],
            "is_active": result["is_active"],
            "created_at": result["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin_check: dict = Depends(verify_superadmin)
):
    """Delete user (Superadmin only)"""
    try:
        users_col = get_users_collection()
        result = users_col.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.put("/{user_id}/role", response_model=dict)
async def update_user_role(
    user_id: str,
    role: str,
    admin_check: dict = Depends(verify_superadmin)
):
    """Change user role (Superadmin only)"""
    if role not in ["user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'user'"
        )
    
    try:
        users_col = get_users_collection()
        result = users_col.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": role, "updated_at": datetime.utcnow()}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"user_id": str(result["_id"]), "new_role": result["role"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating role: {str(e)}"
        )

@router.put("/{user_id}/toggle-status", response_model=dict)
async def toggle_user_status(
    user_id: str,
    admin_check: dict = Depends(verify_superadmin)
):
    """Toggle user active/inactive status (Superadmin only)"""
    try:
        users_col = get_users_collection()
        
        # Get current user status
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Toggle status
        new_status = not user.get("is_active", True)
        result = users_col.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": new_status, "updated_at": datetime.utcnow()}},
            return_document=True
        )
        
        return {
            "id": str(result["_id"]),
            "username": result["username"],
            "is_active": result["is_active"],
            "message": f"User {'activated' if new_status else 'locked'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling user status: {str(e)}"
        )

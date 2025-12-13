"""
Authentication & Authorization - MongoDB (No Password Hashing)
"""
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import os
from dotenv import load_dotenv
from bson import ObjectId
from database import get_users_collection

load_dotenv()

# Config
SECRET_KEY = os.getenv("SECRET_KEY", "aiclone-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class PasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        # No hashing - just return plaintext
        return password
    
    @staticmethod
    def verify_password(plain_password: str, stored_password: str) -> bool:
        # Simple plaintext comparison
        return plain_password == stored_password

class AuthToken:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            role = payload.get("role")
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            return {"username": username, "role": role}
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

class Users:
    """User authentication & management"""
    
    # Demo users - also stored in MongoDB
    DEMO_USERS = {
        "superadmin": {
            "password": "superadmin123",
            "role": "superadmin",
            "email": "superadmin@aiclone.local"
        },
        "user1": {
            "password": "user123",
            "role": "user",
            "email": "user1@aiclone.local"
        },
        "user2": {
            "password": "user123",
            "role": "user",
            "email": "user2@aiclone.local"
        }
    }

    @staticmethod
    def authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user: demo users first, then MongoDB"""
        # 1. Check in-memory demo users (superadmin, user1, user2)
        demo_user = Users.DEMO_USERS.get(username)
        if demo_user and demo_user["password"] == password:
            return {
                "username": username,
                "email": demo_user["email"],
                "role": demo_user["role"]
            }

        # 2. Check MongoDB users
        try:
            users_col = get_users_collection()
            user = users_col.find_one({"username": username})

            if not user:
                return None

            # Support both "password_hash" (old) and "password" (plain) fields
            stored_password = user.get("password_hash") or user.get("password")
            if not stored_password:
                return None

            if not PasswordManager.verify_password(password, stored_password):
                return None

            return {
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            }
        except Exception as e:
            print(f"Auth error: {e}")
            return None

    @staticmethod
    def is_admin(role: str) -> bool:
        return role == "superadmin"
    
    @staticmethod
    def is_superadmin(role: str) -> bool:
        return role == "superadmin"
    
    @staticmethod
    def init_demo_users():
        """Initialize demo users in MongoDB"""
        try:
            users_col = get_users_collection()
            for username, user_data in Users.DEMO_USERS.items():
                existing = users_col.find_one({"username": username})
                if not existing:
                    users_col.insert_one({
                        "username": username,
                        "email": user_data["email"],
                        "password_hash": PasswordManager.hash_password(user_data["password"]),
                        "role": user_data["role"],
                        "is_active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    })
                    print(f"[OK] Created demo user: {username}")
        except Exception as e:
            print(f"[ERROR] Error initializing demo users: {e}")

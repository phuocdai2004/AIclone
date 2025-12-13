"""
Pydantic schemas for request/response
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PersonalityAnswer(BaseModel):
    category: str
    response: str

class CloneCreate(BaseModel):
    name: str
    personality: List[PersonalityAnswer]
    speaking_style: str
    face_image: Optional[str] = None
    face_features: Optional[dict] = None

class CloneUpdate(BaseModel):
    name: Optional[str] = None
    speaking_style: Optional[str] = None
    face_image: Optional[str] = None
    personality: Optional[List[PersonalityAnswer]] = None
    memories: Optional[list] = None

class CloneResponse(BaseModel):
    id: int
    name: str
    personality: List[PersonalityAnswer]
    speaking_style: str
    face_image: Optional[str] = None
    face_features: Optional[dict] = None
    memories: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CloneList(BaseModel):
    id: int
    name: str
    created_at: datetime
    personality_count: Optional[int] = 0

    class Config:
        from_attributes = True

# User Schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"  # only user role

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

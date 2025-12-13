"""
Clone Database Models & Setup - MongoDB
"""
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "aiclone_db")

print(f"[MONGODB] MongoDB URL: {MONGO_URL}")

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    # Verify connection
    client.server_info()
    db = client[MONGO_DB]
    db_connected = True
    print("[OK] MongoDB connected successfully")
except ServerSelectionTimeoutError as e:
    print(f"[ERROR] MongoDB connection failed: {e}")
    print("[WARNING] Make sure MongoDB is running on localhost:27017")
    db_connected = False
    db = None

# Collections
def get_db():
    """Get the MongoDB database instance"""
    return db

def get_users_collection():
    if db is None:
        raise Exception("MongoDB not connected")
    return db["users"]

def get_clones_collection():
    if db is None:
        raise Exception("MongoDB not connected")
    return db["clones"]

# Pydantic Models for validation
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "user"  # only user role
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    password_hash: str
    created_at: datetime
    updated_at: datetime

class UserResponse(UserBase):
    created_at: datetime
    
    class Config:
        from_attributes = True

class CloneBase(BaseModel):
    name: str
    personality: Optional[Dict[str, Any]] = None
    speaking_style: Optional[str] = None
    face_image: Optional[str] = None  # Base64
    face_features: Optional[Dict[str, Any]] = None
    memories: Optional[List[Dict[str, Any]]] = []
    created_by: Optional[str] = None  # username

class CloneCreate(CloneBase):
    pass

class CloneInDB(CloneBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CloneResponse(CloneBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Database operations
def get_history_collection():
    if db is None:
        raise Exception("MongoDB not connected")
    return db["conversation_history"]

def get_learned_collection():
    if db is None:
        raise Exception("MongoDB not connected")
    return db["learned_qa"]

def add_history_entry(user_message: str, ai_response: str, user_name: str = "User", timestamp: Optional[datetime] = None):
    """Store a chat entry in MongoDB"""
    history_col = get_history_collection()
    payload = {
        "user_message": user_message,
        "ai_response": ai_response,
        "user_name": user_name,
        "created_at": datetime.utcnow(),
        "timestamp": timestamp if timestamp else datetime.utcnow()
    }
    history_col.insert_one(payload)
    return payload

def get_history_entries(limit: int = 50):
    """Retrieve recent chat history"""
    history_col = get_history_collection()
    cursor = history_col.find().sort("timestamp", -1).limit(limit)
    return [
        {
            "user_message": doc.get("user_message", ""),
            "ai_response": doc.get("ai_response", ""),
            "timestamp": (
                doc.get("timestamp") or doc.get("created_at")
            ).isoformat() if (doc.get("timestamp") or doc.get("created_at")) else datetime.utcnow().isoformat(),
            "user_name": doc.get("user_name", "User")
        }
        for doc in cursor
    ]

def purge_history():
    """Clear conversation history"""
    history_col = get_history_collection()
    history_col.delete_many({})

def add_learned_qa(question: str, answer: str, confidence: float = 0.5):
    """Save a learned QA pair"""
    learned_col = get_learned_collection()
    payload = {
        "question": question,
        "answer": answer,
        "confidence": confidence,
        "created_at": datetime.utcnow()
    }
    learned_col.update_one({"question": question}, {"$set": payload}, upsert=True)
    return payload

def list_learned_qa(limit: int = 50):
    """Retrieve learned QA entries"""
    learned_col = get_learned_collection()
    cursor = learned_col.find().sort("created_at", -1).limit(limit)
    return [
        {
            "question": doc.get("question", ""),
            "answer": doc.get("answer", ""),
            "confidence": doc.get("confidence", 0.0),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None
        }
        for doc in cursor
    ]

def remove_learned_qa(question: str):
    """Delete a learned QA document"""
    learned_col = get_learned_collection()
    learned_col.delete_many({"question": question})

def init_db():
    """Initialize database - create indexes on startup"""
    try:
        if db is None:
            print("[WARNING] MongoDB not connected")
            return
        
        # Create indexes for history collection
        history_col = get_history_collection()
        history_col.create_index("timestamp")
        
        # Create indexes for learned collection
        learned_col = get_learned_collection()
        learned_col.create_index("question", unique=True)
        
        # Create indexes for users collection
        users_col = get_users_collection()
        users_col.create_index("username", unique=True)
        users_col.create_index("email", unique=True)
        
        # Create indexes for clones collection
        clones_col = get_clones_collection()
        clones_col.create_index("created_by")
        
        print("[OK] Database indexes created")
    except Exception as e:
        print(f"[WARNING] Error initializing database: {e}")

def close_db():
    """Close MongoDB connection"""
    try:
        if client:
            client.close()
            print("[OK] MongoDB connection closed")
    except Exception as e:
        print(f"[WARNING] Error closing database: {e}")



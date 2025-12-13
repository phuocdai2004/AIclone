"""
Clone API Routes - MongoDB Version
Admin Only for Create/Delete, Public for Read/Chat
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from database import get_clones_collection, get_users_collection
from schemas import CloneCreate, CloneUpdate, CloneResponse, CloneList
from datetime import datetime
from auth import AuthToken
from bson import ObjectId

router = APIRouter(prefix="/api/clones", tags=["clones"])

def verify_admin(authorization: Optional[str] = Header(None)):
    """Verify that user is superadmin"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = AuthToken.verify_token(token)
        if payload.get("role") != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superadmin access required"
            )
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )

@router.post("/create", response_model=CloneResponse)
async def create_clone(
    clone: CloneCreate, 
    admin = Depends(verify_admin)
):
    """Create a new AI clone - ADMIN ONLY"""
    try:
        clones_col = get_clones_collection()
        
        # Check if clone already exists
        existing = clones_col.find_one({"name": clone.name})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Clone '{clone.name}' already exists"
            )
        
        # Create new clone
        clone_doc = {
            "name": clone.name,
            "personality": clone.personality or {},
            "speaking_style": clone.speaking_style or "",
            "face_image": clone.face_image or "",
            "face_features": clone.face_features or {},
            "memories": [],
            "created_by": admin.get("username"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = clones_col.insert_one(clone_doc)
        clone_doc["_id"] = result.inserted_id
        
        return clone_doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating clone: {str(e)}"
        )

@router.get("/", response_model=List[dict])
async def list_clones():
    """Get all clones"""
    try:
        clones_col = get_clones_collection()
        clones = list(clones_col.find({}))
        
        result = []
        for clone in clones:
            result.append({
                "id": str(clone["_id"]),
                "name": clone["name"],
                "created_at": clone["created_at"],
                "created_by": clone.get("created_by", "unknown"),
                "personality_count": len(clone.get("personality", {})),
                "memories_count": len(clone.get("memories", []))
            })
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching clones: {str(e)}"
        )

@router.get("/{clone_id}", response_model=CloneResponse)
async def get_clone(clone_id: str):
    """Get a specific clone by ID"""
    try:
        clones_col = get_clones_collection()
        clone = clones_col.find_one({"_id": ObjectId(clone_id)})
        if not clone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone with ID {clone_id} not found"
            )
        return clone
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching clone: {str(e)}"
        )

@router.get("/name/{clone_name}", response_model=CloneResponse)
async def get_clone_by_name(clone_name: str):
    """Get a clone by name"""
    try:
        clones_col = get_clones_collection()
        clone = clones_col.find_one({"name": clone_name})
        if not clone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone '{clone_name}' not found"
            )
        return clone
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching clone: {str(e)}"
        )

@router.put("/{clone_id}", response_model=CloneResponse)
async def update_clone(
    clone_id: str, 
    clone_update: CloneUpdate, 
    admin = Depends(verify_admin)
):
    """Update a clone - ADMIN ONLY"""
    try:
        clones_col = get_clones_collection()
        
        # Prepare update data
        update_data = {}
        if clone_update.name:
            update_data["name"] = clone_update.name
        if clone_update.speaking_style:
            update_data["speaking_style"] = clone_update.speaking_style
        if clone_update.face_image:
            update_data["face_image"] = clone_update.face_image
        if clone_update.personality:
            update_data["personality"] = clone_update.personality
        if clone_update.memories:
            update_data["memories"] = clone_update.memories
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = clones_col.find_one_and_update(
            {"_id": ObjectId(clone_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone with ID {clone_id} not found"
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating clone: {str(e)}"
        )

@router.delete("/{clone_id}")
async def delete_clone(
    clone_id: str, 
    admin = Depends(verify_admin)
):
    """Delete a clone - ADMIN ONLY"""
    try:
        clones_col = get_clones_collection()
        result = clones_col.find_one_and_delete({"_id": ObjectId(clone_id)})
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone with ID {clone_id} not found"
            )
        
        return {"message": f"Clone '{result['name']}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting clone: {str(e)}"
        )

@router.post("/{clone_id}/memory", response_model=dict)
async def add_memory(clone_id: str, message: dict):
    """Add a memory (conversation) to a clone - PUBLIC"""
    try:
        clones_col = get_clones_collection()
        
        result = clones_col.find_one_and_update(
            {"_id": ObjectId(clone_id)},
            {
                "$push": {
                    "memories": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "user_message": message.get("user_message"),
                        "clone_response": message.get("clone_response")
                    }
                },
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone with ID {clone_id} not found"
            )
        
        return {"message": "Memory added successfully", "memories_count": len(result.get("memories", []))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding memory: {str(e)}"
        )

@router.get("/{clone_id}/stats")
async def get_clone_stats(clone_id: str):
    """Get statistics about a clone - PUBLIC"""
    try:
        clones_col = get_clones_collection()
        clone = clones_col.find_one({"_id": ObjectId(clone_id)})
        
        if not clone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clone with ID {clone_id} not found"
            )
        
        return {
            "id": str(clone["_id"]),
            "name": clone["name"],
            "personality_answers": len(clone.get("personality", {})),
            "total_memories": len(clone.get("memories", [])),
            "created_at": clone["created_at"],
            "updated_at": clone["updated_at"],
            "has_face": bool(clone.get("face_image")),
            "has_features": bool(clone.get("face_features"))
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )

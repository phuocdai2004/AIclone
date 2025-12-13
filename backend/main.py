"""
AIClone Backend - FastAPI + Groq API (Primary) + Google Generative AI (Backup) + MongoDB
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import os
from datetime import datetime, timedelta
import json
from difflib import SequenceMatcher
import google.generativeai as genai
from groq import Groq
import asyncio
from functools import lru_cache
import threading
import base64
from pathlib import Path
import requests
from urllib.parse import quote
from database import (
    init_db as init_mongodb,
    close_db,
    get_clones_collection,
    db_connected,
    add_history_entry,
    get_history_entries,
    purge_history,
    add_learned_qa,
    list_learned_qa,
    remove_learned_qa,
)
from auth import Users
from schemas import CloneCreate, CloneUpdate, CloneResponse, CloneList

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not db_connected:
        print("[WARNING] MongoDB not connected")
    else:
        init_mongodb()
        Users.init_demo_users()
        print("[OK] MongoDB initialized on startup")
    yield
    # Shutdown
    close_db()
    print("[OK] MongoDB connection closed")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="AIClone API",
    description="AI Chatbot Backend with Google Generative AI + MongoDB + Auth",
    version="2.0.0",
    lifespan=lifespan
)

# Mount static files
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Models ==============

class Message(BaseModel):
    text: str
    user_name: str = "User"

class ChatResponse(BaseModel):
    user_message: str
    ai_response: str
    timestamp: str
    file_type: Optional[str] = None  # "image" or "document"
    file_path: Optional[str] = None

class ConversationHistory(BaseModel):
    messages: List[ChatResponse]

class AIProfileUpdate(BaseModel):
    name: str
    avatar: str
    status: str
    description: str
    personality: str
    color: str

# ============== File Upload Setup ==============

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_FILE_TYPES = {"application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# ============== Config ==============
GROQ_API_KEY = "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"
groq_client = Groq(api_key=GROQ_API_KEY)
print(f"[OK] Groq API Key configured: {GROQ_API_KEY[:20]}...")

GEMINI_API_KEY = "AIzaSyCc--Ukp7CS7S1lPFFAJs_k5FUbv8deMgM"
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.5-flash')
print(f"[OK] Gemini API Key configured: {GEMINI_API_KEY[:10]}...")

# ============== QA Model (Fallback) ==============

class QAModel:
    """Fallback QA matching model"""
    
    def __init__(self, filepath='qa_model.json'):
        self.qa_pairs = []
        self.load_data(filepath)
    
    def load_data(self, filepath='qa_model.json'):
        """Load Q&A data"""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.qa_pairs = json.load(f)
                print(f"[OK] Loaded {len(self.qa_pairs)} Q&A pairs as fallback")
        except Exception as e:
            print(f"[WARN] Error loading fallback model: {e}")
    
    def find_best_answer(self, question, threshold=0.5):
        """Find best matching answer"""
        if not self.qa_pairs:
            return None
        
        best_match = None
        best_score = 0
        
        for pair in self.qa_pairs:
            similarity = SequenceMatcher(
                None,
                question.lower(),
                pair.get('question', '').lower()
            ).ratio()
            
            if similarity > best_score:
                best_score = similarity
                best_match = pair.get('answer', '')
        
        if best_score >= threshold:
            return best_match
        return None

# Load QA Model as fallback
qa_model = QAModel()

# ============== Session Context ==============

class SessionContext:
    """Store current file/image context for training"""
    def __init__(self):
        self.current_file_content = ""
        self.current_file_name = ""
        self.current_file_analysis = ""
    
    def set_file(self, file_name: str, content: str, analysis: str):
        """Set current file being analyzed"""
        self.current_file_content = content
        self.current_file_name = file_name
        self.current_file_analysis = analysis
        print(f"[SESSION] Context set for: {file_name}")
    
    def get_context_prompt(self) -> str:
        """Get current context as prompt"""
        if self.current_file_content:
            return f"""
Current file being analyzed: {self.current_file_name}

File content:
{self.current_file_content}

Previous analysis:
{self.current_file_analysis}

---
"""
        return ""
    
    def clear(self):
        """Clear context"""
        self.current_file_content = ""
        self.current_file_name = ""
        self.current_file_analysis = ""

session = SessionContext()

# ============== Response Cache ==============

class ResponseCache:
    """Simple cache to avoid redundant questions"""
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key):
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key, value):
        expiry = datetime.now() + timedelta(seconds=self.ttl)
        self.cache[key] = (value, expiry)
    
    def clear(self):
        self.cache.clear()

response_cache = ResponseCache(ttl_seconds=3600)

# ============== System Prompt ==============

SYSTEM_PROMPT = """
You are AIClone - an AI version of the user.

Characteristics:
- Name: AIClone
- Personality: Thô, biết giỡn, trả trêu, dí dỏm, thoải mái, không quá trang trọng
- Language: Vietnamese primarily
- Style: Nói chuyện thân thiện như bạn bè, biết cách trêu đùa, có sense of humor
- Attitude: Cởi mở, thoáng thoai, không ngại nói những điều thô thiển nếu phù hợp
- Knowledge: About Vietnam, programming, technology, relationships, and many other topics

Answer naturally, like a real friend chatting casually with you.
Use slang, jokes, and teasing when appropriate.
If asked about yourself, say you are AIClone - an AI version of the user.

IMPORTANT LANGUAGE RULES:
- ALWAYS respond in Vietnamese by default (Tiếng Việt)
- Only switch to English if the user explicitly writes in English or requests English
- If user asks in Vietnamese -> Reply in Vietnamese
- If user asks in English -> Reply in English
- If user says "speak English" or "nói tiếng Anh" -> Switch to English
- If user says "speak Vietnamese" or "nói tiếng Việt" -> Switch back to Vietnamese

Be witty and don't be afraid to crack jokes or tease back!
"""

# ============== Helper Functions ==============

def process_image_with_gemini(image_path: str, text_query: str = "") -> str:
    """Process image with Gemini Vision API"""
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.standard_b64encode(image_file.read()).decode("utf-8")
        
        # Determine MIME type
        if image_path.lower().endswith(('.jpg', '.jpeg')):
            mime_type = "image/jpeg"
        elif image_path.lower().endswith('.png'):
            mime_type = "image/png"
        elif image_path.lower().endswith('.gif'):
            mime_type = "image/gif"
        else:
            mime_type = "image/webp"
        
        query = text_query if text_query else "Please analyze this image and describe what you see"
        prompt = f"{SYSTEM_PROMPT}\n\n{query}"
        
        response = gemini_model.generate_content([
            prompt,
            {
                "mime_type": mime_type,
                "data": image_data
            }
        ])
        
        if response.text:
            return response.text.strip()[:1000]
        return "Could not analyze image"
    except Exception as e:
        print(f"[ERROR] Image processing failed: {str(e)[:50]}")
        return None

def process_file_with_gemini(file_path: str, text_query: str = "") -> str:
    """Process PDF/DOCX/TXT file with Gemini"""
    try:
        file_content = ""
        
        # Extract text from different file types
        if file_path.lower().endswith('.pdf'):
            try:
                import PyPDF2
                with open(file_path, "rb") as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    for page_num in range(min(5, len(pdf_reader.pages))):  # First 5 pages
                        page = pdf_reader.pages[page_num]
                        file_content += page.extract_text()
            except Exception as e:
                print(f"[WARN] PDF extraction failed: {e}")
                file_content = "[PDF file - content extraction failed]"
        
        elif file_path.lower().endswith('.docx'):
            try:
                from docx import Document
                doc = Document(file_path)
                for para in doc.paragraphs[:50]:  # First 50 paragraphs
                    file_content += para.text + "\n"
            except Exception as e:
                print(f"[WARN] DOCX extraction failed: {e}")
                file_content = "[DOCX file - content extraction failed]"
        
        elif file_path.lower().endswith('.txt'):
            with open(file_path, "r", encoding="utf-8") as f:
                file_content = f.read()
        
        # Limit content length
        file_content = file_content[:3000]
        
        query = text_query if text_query else "Please analyze and summarize this document"
        prompt = f"{SYSTEM_PROMPT}\n\nDocument content:\n{file_content}\n\nUser query: {query}"
        
        # Use Gemini API for file processing
        response = gemini_model.generate_content(prompt, generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=500,
        ))
        
        if response.text:
            return response.text.strip()[:1000]
        return "Could not process file"
    except Exception as e:
        print(f"[ERROR] File processing failed: {str(e)[:50]}")
        return None

def search_internet(query: str) -> str:
    """Search internet using DuckDuckGo (free, no API key needed)"""
    try:
        print(f"[SEARCH] Searching internet for: {query}")
        
        # DuckDuckGo API endpoint
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_redirect": 1,
            "no_html": 1
        }
        
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        # Extract search results
        results = []
        
        # Add instant answer if available
        if data.get("AbstractText"):
            results.append(f"Summary: {data['AbstractText'][:300]}")
        
        # Add related topics
        if data.get("RelatedTopics"):
            for topic in data["RelatedTopics"][:3]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append(topic["Text"][:200])
        
        if results:
            return "\n\n".join(results)
        return "No search results found"
    except Exception as e:
        print(f"[ERROR] Search failed: {str(e)[:50]}")
        return None

def should_search_internet(query: str) -> bool:
    """Detect if question needs internet search"""
    keywords = [
        "cách", "làm sao", "gì", "ai", "nào", "lúc nào", "khi nào",
        "ở đâu", "phương pháp", "bí quyết", "mẹo", "tips",
        "mới nhất", "hiện tại", "hôm nay", "tin tức",
        "tán gái", "chiếm trái tim", "cách nói chuyện"
    ]
    return any(keyword in query.lower() for keyword in keywords)

def get_ai_response_from_gemini(user_message: str) -> str:
    """Get response from Google Generative AI (BACKUP only)"""
    try:
        # Check if we should search internet
        search_results = ""
        if should_search_internet(user_message):
            search_results = search_internet(user_message)
            if search_results:
                print(f"[SEARCH] Found results, including in response")
        
        # Include session context if file is being analyzed
        context_prompt = session.get_context_prompt()
        
        # Build prompt with search results if available
        if search_results:
            full_prompt = f"{SYSTEM_PROMPT}\n{context_prompt}\nRecent search results:\n{search_results}\n\nUser question: {user_message}\n\nBased on the search results and your knowledge, provide a helpful answer."
        else:
            full_prompt = f"{SYSTEM_PROMPT}\n{context_prompt}\nUser: {user_message}"
        
        # Use Gemini API
        response = gemini_model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1000,
            )
        )
        
        if response.text:
            return response.text.strip()
        else:
            return "Sorry, I couldn't answer that question."
    except Exception as e:
        print(f"[ERROR] Gemini error: {str(e)[:50]}")
        return None

def get_ai_response_from_groq(user_message: str) -> str:
    """Get response from Groq API (PRIMARY - fast & free)"""
    try:
        # Check if we should search internet
        search_results = ""
        if should_search_internet(user_message):
            search_results = search_internet(user_message)
            if search_results:
                print(f"[SEARCH] Found results, including in response")
        
        # Include session context if file is being analyzed
        context_prompt = session.get_context_prompt()
        
        # Build prompt with search results if available
        if search_results:
            full_prompt = f"{SYSTEM_PROMPT}\n{context_prompt}\nRecent search results:\n{search_results}\n\nUser question: {user_message}\n\nBased on the search results and your knowledge, provide a helpful answer."
        else:
            full_prompt = f"{SYSTEM_PROMPT}\n{context_prompt}\nUser: {user_message}"
        
        # Use Groq API (VERY FAST!)
        message = groq_client.chat.completions.create(
            messages=[
                {"role": "user", "content": full_prompt}
            ],
            model="llama-3.3-70b-versatile",  # Use this model
            temperature=0.7,
            max_tokens=1000,
        )
        
        if message.choices[0].message.content:
            return message.choices[0].message.content.strip()
        else:
            return "Sorry, I couldn't answer that question."
    except Exception as e:
        print(f"[ERROR] Groq error: {str(e)[:50]}")
        return None

def get_ai_response(user_message: str) -> str:
    """Get response: Groq PRIMARY (free & fast) -> Gemini BACKUP (when Groq fails)"""
    # 1. Check cache first (instant!)
    cached = response_cache.get(user_message)
    if cached:
        print(f"[CACHE] Hit for: {user_message[:30]}")
        return cached
    
    # 2. Try Groq FIRST (PRIMARY - unlimited free tier!)
    print(f"[GROQ] PRIMARY: fetching response from Groq...")
    groq_response = get_ai_response_from_groq(user_message)
    if groq_response and groq_response != None:
        print(f"[GROQ] Success! Response ready")
        response_cache.set(user_message, groq_response)
        return groq_response
    
    # 3. Try Gemini as BACKUP (when Groq fails)
    print(f"[GROQ] Failed. Fallback to Gemini...")
    gemini_response = get_ai_response_from_gemini(user_message)
    if gemini_response and gemini_response != None:
        print(f"[GEMINI] Backup success! Response ready")
        response_cache.set(user_message, gemini_response)
        return gemini_response
    
    # 4. Fallback to learned QA (when both APIs fail)
    print(f"[FALLBACK] Both APIs failed. Using training_data...")
    learned_response = qa_model.find_best_answer(user_message, threshold=0.5)
    if learned_response:
        print(f"[LEARNED] QA hit")
        response_cache.set(user_message, learned_response)
        return learned_response
    
    # 5. Ultimate fallback
    fallback = "I don't quite understand. Can you ask again?"
    response_cache.set(user_message, fallback)
    return fallback


# ============== Routes ==============

# AI-Bot Voice Chat Endpoint
class AIBotMessage(BaseModel):
    message: str

@app.post("/api/ai/chat")
async def ai_bot_chat(data: AIBotMessage):
    """AI-Bot voice chat endpoint - optimized for voice conversation"""
    try:
        user_message = data.message.strip()
        
        if not user_message:
            return {"response": "Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?"}
        
        # Generate AI response with conversational style
        ai_response = get_ai_response(user_message)
        
        # Make response more conversational for voice
        if ai_response and len(ai_response) > 300:
            # Truncate for voice (keep it short)
            sentences = ai_response.split('.')
            short_response = '. '.join(sentences[:3]) + '.'
            ai_response = short_response
        
        return {
            "response": ai_response,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[ERROR] AI-Bot chat error: {e}")
        return {"response": "Xin lỗi, có lỗi xảy ra. Hãy thử lại sau!"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: Message):
    """Main chat endpoint"""
    try:
        # Generate AI response
        ai_response = get_ai_response(message.text)
        add_history_entry(message.text, ai_response, user_name=message.user_name)
        return ChatResponse(
            user_message=message.text,
            ai_response=ai_response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...), query: str = "", request: Request = None):
    """Upload and analyze image"""
    try:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Invalid image type. Allowed: JPEG, PNG, GIF, WebP")
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, f"img_{datetime.now().timestamp()}_{file.filename}")
        with open(file_path, "wb") as f:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large (max 10MB)")
            f.write(content)
        
        # Generate URL for the file - normalize path separators
        relative_path = file_path.replace(os.sep, '/')
        
        # Try to get base URL from request, fallback to localhost
        if request:
            base_url = f"{request.url.scheme}://{request.url.netloc}"
        else:
            base_url = "http://localhost:8000"
        
        file_url = f"{base_url}/{relative_path}"
        
        print(f"[UPLOAD] Image saved to: {file_path}")
        print(f"[UPLOAD] Image URL: {file_url}")
        
        # Process with Gemini (only if query is provided)
        if query:
            ai_response = process_image_with_gemini(file_path, query)
            if ai_response:
                session.set_file(file.filename, "[Image uploaded]", ai_response)
                add_learned_qa(f"Image: {query or 'image analysis'}", ai_response, confidence=0.9)
                print(f"[TRAINING] Image {file.filename} set as context")
                return {
                    "status": "success",
                    "file_path": file_path,
                    "url": file_url,
                    "ai_response": ai_response,
                    "timestamp": datetime.now().isoformat(),
                    "message": "Image analyzed! You can now ask questions about it."
                }
        
        # Return success without analysis if no query
        return {
            "status": "success",
            "file_path": file_path,
            "url": file_url,
            "timestamp": datetime.now().isoformat(),
            "message": "Image uploaded successfully"
        }
    except Exception as e:
        print(f"[ERROR] Upload image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/document")
async def upload_document(file: UploadFile = File(...), query: str = ""):
    """Upload and analyze document"""
    try:
        if file.content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, TXT, DOCX")
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, f"doc_{datetime.now().timestamp()}_{file.filename}")
        with open(file_path, "wb") as f:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large (max 10MB)")
            f.write(content)
        
        # Process with Gemini for all document types
        ai_response = process_file_with_gemini(file_path, query)
        
        if ai_response:
            # Extract file content for context
            file_content = ""
            if file_path.lower().endswith('.txt'):
                with open(file_path, "r", encoding="utf-8") as f:
                    file_content = f.read()[:2000]
            
            # Set session context for this document
            session.set_file(file.filename, file_content, ai_response)
            add_learned_qa(f"Document: {file.filename} - {query or 'analysis'}", ai_response, confidence=0.9)
            print(f"[TRAINING] Document {file.filename} set as context")
            return {
                "status": "success",
                "file_path": file_path,
                "file_name": file.filename,
                "ai_response": ai_response,
                "timestamp": datetime.now().isoformat(),
                "message": "Document analyzed! You can now ask questions about it."
            }
        else:
            return {
                "status": "success",
                "file_path": file_path,
                "file_name": file.filename,
                "message": "File uploaded successfully but analysis failed"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=ConversationHistory)
async def get_history(limit: int = 50):
    """Get conversation history"""
    try:
        entries = get_history_entries(limit)
        messages = [ChatResponse(**entry) for entry in reversed(entries)]
        return ConversationHistory(messages=messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history")
async def clear_history():
    """Clear conversation history"""
    try:
        purge_history()
        return {"message": "History cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/learned")
async def get_learned_qa(limit: int = 50):
    """Get learned Q&A pairs"""
    try:
        learned = list_learned_qa(limit)
        return {
            "total": len(learned),
            "learned_qa": learned
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/learned/{question}")
async def delete_learned(question: str):
    """Delete learned Q&A pair"""
    try:
        remove_learned_qa(question)
        return {"message": "Learned Q&A deleted"}
        response_cache.clear()
        return {"message": f"Deleted learned Q&A for: {question}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cache/clear")
async def clear_cache():
    """Clear response cache"""
    try:
        response_cache.clear()
        return {"message": "Cache cleared", "cache_size": len(response_cache.cache)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== AIClone Profile Management ==============

def get_ai_profile_collection():
    """Get AIClone profile collection from MongoDB"""
    from database import get_db, db_connected
    if not db_connected:
        raise HTTPException(status_code=500, detail="Database not connected")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return db["ai_profile"]

@app.get("/api/ai-profile")
async def get_ai_profile():
    """Get AIClone profile"""
    try:
        collection = get_ai_profile_collection()
        profile = collection.find_one({"type": "main"})
        
        if not profile:
            # Return default profile
            default = {
                "type": "main",
                "name": "AIClone",
                "avatar": "🤖",
                "status": "Online",
                "description": "AI version of you - Thô, giỡn, trả trêu, dí dỏm, thân thiện",
                "personality": "Friendly, witty, casual",
                "color": "#0066FF"
            }
            collection.insert_one(default)
            profile = default
        
        # Remove MongoDB _id from response
        profile.pop("_id", None)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Get AI Profile: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting profile: {str(e)}")

@app.put("/api/ai-profile")
async def update_ai_profile(profile_update: AIProfileUpdate):
    """Update AIClone profile (superadmin only)"""
    try:
        collection = get_ai_profile_collection()
        
        profile_data = {
            "type": "main",
            "name": profile_update.name,
            "avatar": profile_update.avatar,
            "status": profile_update.status,
            "description": profile_update.description,
            "personality": profile_update.personality,
            "color": profile_update.color,
            "updated_at": datetime.now()
        }
        
        result = collection.update_one(
            {"type": "main"},
            {"$set": profile_data},
            upsert=True
        )
        
        # Remove _id from response
        profile_data.pop("_id", None)
        
        return {
            "message": "Profile updated successfully",
            "modified_count": result.modified_count,
            "upserted_id": str(result.upserted_id) if result.upserted_id else None,
            "profile": profile_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Update AI Profile: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

@app.get("/api/admin/user-queries/{username}")
async def get_user_queries(username: str, limit: int = 100):
    """Get all queries from a specific user"""
    try:
        from database import get_db
        db = get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get conversation history for user
        history_collection = db.get_collection("conversation_history")
        user_history = list(history_collection.find(
            {},
            {"user_message": 1, "ai_response": 1, "timestamp": 1, "_id": 0}
        ).sort("timestamp", -1).limit(limit))
        
        # Format response
        queries = []
        for entry in user_history:
            try:
                timestamp_str = entry.get("timestamp", "")
                # Handle both ISO format and datetime objects
                if timestamp_str:
                    if isinstance(timestamp_str, str):
                        date_str = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')).strftime("%d/%m/%Y %H:%M")
                    else:
                        date_str = timestamp_str.strftime("%d/%m/%Y %H:%M") if hasattr(timestamp_str, 'strftime') else ""
                else:
                    date_str = ""
                
                ai_response = entry.get("ai_response", "")
                response_preview = ai_response[:100] + "..." if len(ai_response) > 100 else ai_response
                
                queries.append({
                    "query": entry.get("user_message", ""),
                    "response": response_preview,
                    "timestamp": timestamp_str,
                    "date": date_str
                })
            except Exception as e:
                print(f"[WARNING] Error formatting query entry: {e}")
                queries.append({
                    "query": entry.get("user_message", ""),
                    "response": entry.get("ai_response", "")[:100],
                    "timestamp": str(entry.get("timestamp", "")),
                    "date": "N/A"
                })
        
        return {
            "username": username,
            "total": len(queries),
            "queries": queries
        }
    except Exception as e:
        print(f"[ERROR] Get user queries: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "username": username,
            "total": 0,
            "queries": [],
            "error": str(e)
        }

@app.get("/api/admin/all-queries")
async def get_all_user_queries():
    """Get all user queries for admin panel"""
    try:
        from database import get_db
        db = get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get all conversation history
        history_collection = db.get_collection("conversation_history")
        all_history = list(history_collection.find(
            {},
            {"user_message": 1, "timestamp": 1, "_id": 0}
        ).sort("timestamp", -1).limit(200))
        
        # Format response
        queries = []
        for entry in all_history:
            try:
                timestamp_str = entry.get("timestamp", "")
                # Handle both ISO format and datetime objects
                if timestamp_str:
                    if isinstance(timestamp_str, str):
                        date_str = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')).strftime("%d/%m/%Y %H:%M")
                    else:
                        date_str = timestamp_str.strftime("%d/%m/%Y %H:%M") if hasattr(timestamp_str, 'strftime') else ""
                else:
                    date_str = ""
                
                queries.append({
                    "query": entry.get("user_message", ""),
                    "timestamp": timestamp_str,
                    "date": date_str
                })
            except Exception as e:
                print(f"[WARNING] Error formatting query entry: {e}")
                queries.append({
                    "query": entry.get("user_message", ""),
                    "timestamp": str(entry.get("timestamp", "")),
                    "date": "N/A"
                })
        
        return {
            "total": len(queries),
            "queries": queries
        }
    except Exception as e:
        print(f"[ERROR] Get all queries: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "total": 0,
            "queries": [],
            "error": str(e)
        }

# ============== Include Routes ==============
from routes import router as clone_router
from auth_routes import router as auth_router
from user_management_routes import router as user_router
app.include_router(clone_router)
app.include_router(auth_router)
app.include_router(user_router)

# ============== Health Check ==============
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "AIClone API is running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "AIClone API",
        "version": "2.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "clones": "/api/clones",
            "auth": "/api/auth",
            "health": "/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print("[START] Starting AIClone with Groq (Primary) + Gemini (Backup) + MongoDB + Auth...")
    print(f"[OK] Groq API Key configured: {GROQ_API_KEY[:20]}...")
    print(f"[OK] MongoDB configured")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )

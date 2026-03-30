from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import pandas as pd

# MongoDB connection
mongo_url = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGODB_URI or MONGO_URL environment variable is required")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'wedus_crm')]

# JWT Config
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Production detection
IS_PRODUCTION = os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RENDER") or os.environ.get("FLY_APP_NAME") or (os.environ.get("FRONTEND_URL", "").startswith("https"))
COOKIE_SECURE = bool(IS_PRODUCTION)
COOKIE_SAMESITE = "none" if IS_PRODUCTION else "lax"

# Create the main app
app = FastAPI(title="Wed Us CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== HELPER FUNCTIONS ==============

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize_doc(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== PYDANTIC MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "team_member"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    color: Optional[str] = None
    created_at: Optional[str] = None

class TeamMemberCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    color: Optional[str] = None

class LeadCreate(BaseModel):
    companyName: str
    phone: Optional[str] = None
    phone2: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    primaryWhatsapp: Optional[int] = 1
    instagram: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = "active"
    category: Optional[str] = "Needs Review"
    priority: Optional[str] = "Medium"
    pipelineStage: Optional[str] = "New Contact"
    assignedTo: Optional[str] = None
    sourceSheet: Optional[str] = None
    nextFollowupDate: Optional[str] = None
    lastContactDate: Optional[str] = None
    portfolioSent: Optional[bool] = False
    priceListSent: Optional[bool] = False
    waSent: Optional[bool] = False
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    companyName: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    whatsapp: Optional[str] = None
    whatsapp2: Optional[str] = None
    primaryWhatsapp: Optional[int] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    pipelineStage: Optional[str] = None
    assignedTo: Optional[str] = None
    sourceSheet: Optional[str] = None
    nextFollowupDate: Optional[str] = None
    lastContactDate: Optional[str] = None
    portfolioSent: Optional[bool] = None
    priceListSent: Optional[bool] = None
    waSent: Optional[bool] = None
    notes: Optional[str] = None
    dateMarkedNotInterested: Optional[str] = None

class ResponseHistoryEntry(BaseModel):
    response: str
    notes: Optional[str] = None
    timestamp: Optional[str] = None
    teamMember: Optional[str] = None
    teamMemberName: Optional[str] = None
    duration: Optional[int] = None
    waNumberUsed: Optional[int] = None
    portfolioSent: Optional[bool] = False
    priceListSent: Optional[bool] = False
    waSent: Optional[bool] = False
    nextFollowupDate: Optional[str] = None

class BulkAction(BaseModel):
    leadIds: List[str]
    action: str
    value: Optional[str] = None

# ============== CATEGORY/PRIORITY MAPPINGS ==============

CATEGORY_RANK = {
    "Meeting Done": 1,
    "Interested": 2,
    "Call Back": 3,
    "Busy": 4,
    "No Response": 5,
    "Foreign": 6,
    "Future Projection": 7,
    "Needs Review": 8,
    "Not Interested": 9
}

PRIORITY_RANK = {
    "Highest": 1,
    "High": 2,
    "Medium": 3,
    "Low": 4,
    "Review": 5,
    "Archive": 6
}

RESPONSE_RANK = {
    "Interested": 1,
    "Call Back": 2,
    "Meeting Done": 3,
    "Busy": 4,
    "No Response": 5,
    "Not Interested": 6,
    "Other": 7
}

PIPELINE_STAGES = [
    "New Contact", "Interested", "Send Portfolio", "Time Given",
    "Meeting Scheduled", "Meeting Done", "Project Follow-up", "Onboarded",
    "Unknown", "Call Again 1", "Call Again 2", "Call Again 3",
    "Not Answering", "Not Interested"
]

TEAM_COLORS = ["#E8536A", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"]

ALL_RESPONSES = [
    "Interested", "Not Interested", "Call Again 1", "Call Again 2", "Call Again 3",
    "Send Portfolio", "Portfolio Sent — Will Let Us Know", "Meeting Scheduled", "Meeting Done",
    "Time Given", "Not Answering / Voicemail", "Busy — Call Back Later", "Wrong Number",
    "Switch Off", "In Meeting — Send Details", "Low Budget", "Inhouse Team",
    "Project Follow-up", "Weekly Message Sent", "Will Let Us Know"
]

# ============== IMPORT HELPERS ==============

def clean_phone(phone: str) -> str:
    """Clean phone number to plain digits"""
    if not phone:
        return ""
    cleaned = re.sub(r'[^\d]', '', str(phone))
    if cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned[-10:] if len(cleaned) >= 10 else cleaned

def clean_instagram(handle: str) -> str:
    """Clean instagram handle"""
    if not handle:
        return ""
    return str(handle).strip().lower().lstrip('@')

def fuzzy_category(value: str) -> str:
    """Map fuzzy category values to standard categories"""
    if not value:
        return "Needs Review"
    v = re.sub(r'[^\w\s]', '', str(value).lower().strip())
    mappings = {
        'interested': 'Interested', 'intrested': 'Interested', 'hot lead': 'Interested',
        'meeting done': 'Meeting Done', 'met': 'Meeting Done', 'md': 'Meeting Done',
        'call back': 'Call Back', 'callback': 'Call Back', 'follow up': 'Call Back', 'followup': 'Call Back', 'call again': 'Call Back', 'cb': 'Call Back',
        'busy': 'Busy', 'retry': 'Busy', 'call later': 'Busy', 'busy retry': 'Busy',
        'no response': 'No Response', 'nr': 'No Response', 'not reachable': 'No Response', 'not picking': 'No Response', 'no answer': 'No Response',
        'foreign': 'Foreign', 'international': 'Foreign', 'nri': 'Foreign', 'abroad': 'Foreign', 'overseas': 'Foreign',
        'future': 'Future Projection', 'future projection': 'Future Projection', 'not now': 'Future Projection', 'future lead': 'Future Projection',
        'not interested': 'Not Interested', 'ni': 'Not Interested', 'declined': 'Not Interested', 'rejected': 'Not Interested', 'not intrested': 'Not Interested',
        'needs review': 'Needs Review'
    }
    for key, val in mappings.items():
        if key in v:
            return val
    return "Needs Review"

def fuzzy_priority(value: str) -> str:
    """Map fuzzy priority values"""
    if not value:
        return "Low"
    v = str(value).lower().strip()
    if any(x in v for x in ['highest', 'urgent', 'very high', 'top']):
        return "Highest"
    if any(x in v for x in ['high', 'important']):
        return "High"
    if any(x in v for x in ['medium', 'mid', 'normal']):
        return "Medium"
    if 'low' in v:
        return "Low"
    return "Low"

def fuzzy_pipeline_stage(value: str) -> str:
    """Map fuzzy pipeline stage values"""
    if not value:
        return "Unknown"
    v = str(value).lower().strip()
    mappings = {
        'new': 'New Contact', 'fresh': 'New Contact', 'new contact': 'New Contact',
        'interested': 'Interested',
        'portfolio sent': 'Send Portfolio', 'send portfolio': 'Send Portfolio',
        'time given': 'Time Given',
        'meeting scheduled': 'Meeting Scheduled', 'meeting fixed': 'Meeting Scheduled', 'appointment': 'Meeting Scheduled',
        'meeting done': 'Meeting Done', 'met': 'Meeting Done',
        'project follow': 'Project Follow-up', 'post meeting': 'Project Follow-up',
        'onboarded': 'Onboarded', 'client': 'Onboarded', 'confirmed': 'Onboarded', 'booked': 'Onboarded',
        'call again 1': 'Call Again 1', 'retry 1': 'Call Again 1',
        'call again 2': 'Call Again 2', 'retry 2': 'Call Again 2',
        'call again 3': 'Call Again 3', 'retry 3': 'Call Again 3',
        'not answering': 'Not Answering', 'no answer': 'Not Answering', 'not picking': 'Not Answering',
        'not interested': 'Not Interested'
    }
    for key, val in mappings.items():
        if key in v:
            return val
    return "Unknown"

def parse_date(value) -> Optional[str]:
    """Parse various date formats to ISO string"""
    if not value or pd.isna(value):
        return None
    
    # If already datetime
    if isinstance(value, datetime):
        return value.isoformat()
    
    # Excel serial number
    if isinstance(value, (int, float)):
        try:
            excel_date = pd.Timestamp('1899-12-30') + pd.Timedelta(days=int(value))
            return excel_date.isoformat()
        except Exception:
            pass
    
    value = str(value).strip()
    formats = [
        '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%m/%d/%Y',
        '%d %b %Y', '%d %B %Y', '%Y/%m/%d', '%d.%m.%Y'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).isoformat()
        except ValueError:
            continue
    return None

def map_column_name(col: str) -> Optional[str]:
    """Map CSV column names to lead fields"""
    col = col.lower().strip()
    mappings = {
        'companyName': ['company', 'company name', 'firm', 'brand', 'client name', 'name', 'business name', 'companyname'],
        'phone': ['phone', 'phone number', 'mobile', 'contact', 'number', 'ph', 'mob', 'cell', 'phone 1', 'primary phone', 'phone1'],
        'phone2': ['phone 2', 'phone2', 'alternate', 'alt phone', 'secondary', 'number 2', 'alternate phone'],
        'whatsapp': ['whatsapp', 'wa', 'wp', 'whatsapp number', 'wa number', 'whatsapp1', 'whatsapp 1'],
        'whatsapp2': ['whatsapp 2', 'wa2', 'wp2', 'whatsapp2', 'second whatsapp'],
        'instagram': ['instagram', 'insta', 'handle', 'ig', 'instagram handle', '@handle', 'insta handle'],
        'email': ['email', 'mail', 'email id', 'e-mail', 'emailid'],
        'city': ['city', 'location', 'place', 'region', 'area'],
        'category': ['category', 'cat', 'type', 'lead type', 'status'],
        'assignedTo': ['assigned to', 'assigned', 'owner', 'handled by', 'team member', 'rep', 'assignedto'],
        'notes': ['notes', 'feedback', 'remarks', 'comments', 'description', 'note'],
        'response1': ['response 1', 'response1', 'r1', 'call 1', 'first response'],
        'response2': ['response 2', 'response2', 'r2', 'call 2', 'second response'],
        'response3': ['response 3', 'response3', 'r3', 'call 3', 'third response'],
        'nextFollowupDate': ['next follow-up', 'followup date', 'next call', 'callback date', 'follow up date', 'nextfollowupdate', 'next followup'],
        'lastContactDate': ['last contact', 'last contacted', 'last call date', 'date of last contact', 'lastcontactdate'],
        'portfolioSent': ['portfolio sent', 'portfolio', 'port sent', 'portfoliosent'],
        'priceListSent': ['price list sent', 'price list', 'pricelist', 'pricelistsent'],
        'pipelineStage': ['pipeline', 'stage', 'pipeline stage', 'workflow', 'pipelinestage'],
        'sourceSheet': ['source', 'source sheet', 'lead source', 'from', 'sourcesheet'],
        'priority': ['priority', 'importance'],
        'address': ['address', 'full address', 'addr'],
        'state': ['state', 'province']
    }
    for field, aliases in mappings.items():
        if col in aliases:
            return field
    return None

# ============== AUTH ROUTES ==============

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800, path="/")
    
    user_data = serialize_doc(user)
    user_data.pop("password_hash", None)
    # Also return tokens in response body for cross-origin header-based auth
    user_data["access_token"] = access_token
    user_data["refresh_token"] = refresh_token
    return user_data

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    # Try cookie first, then Authorization header, then request body
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        try:
            body = await request.json()
            token = body.get("refresh_token")
        except Exception:
            pass
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"], user["role"])
        
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=900, path="/")
        
        return {"message": "Token refreshed", "access_token": access_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ============== TEAM ROUTES ==============

@api_router.get("/team")
async def get_team_members(request: Request):
    await get_current_user(request)
    members = await db.users.find({}, {"password_hash": 0}).to_list(100)
    return [serialize_doc(m) for m in members]

@api_router.post("/team")
async def create_team_member(member: TeamMemberCreate, request: Request):
    await require_admin(request)
    
    existing = await db.users.find_one({"email": member.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    count = await db.users.count_documents({})
    color = member.color or TEAM_COLORS[count % len(TEAM_COLORS)]
    
    user_doc = {
        "email": member.email.lower(),
        "password_hash": hash_password(member.password),
        "name": member.name,
        "role": "team_member",
        "color": color,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    user_data = serialize_doc(user_doc)
    user_data.pop("password_hash", None)
    return user_data

@api_router.delete("/team/{user_id}")
async def delete_team_member(user_id: str, request: Request):
    await require_admin(request)
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Team member deleted"}

# ============== LEADS ROUTES ==============

def calculate_ranks(lead_data: dict) -> dict:
    """Calculate and add rank fields based on category, priority, and response"""
    if "category" in lead_data and lead_data["category"]:
        lead_data["categoryRank"] = CATEGORY_RANK.get(lead_data["category"], 99)
    if "priority" in lead_data and lead_data["priority"]:
        lead_data["priorityRank"] = PRIORITY_RANK.get(lead_data["priority"], 99)
    return lead_data

def calculate_most_common_response(response_history: list) -> tuple:
    """Calculate most common response from history"""
    if not response_history:
        return None, None
    
    response_counts = {}
    for entry in response_history:
        resp = entry.get("response", "Other")
        response_counts[resp] = response_counts.get(resp, 0) + 1
    
    most_common = max(response_counts, key=response_counts.get)
    rank = RESPONSE_RANK.get(most_common, 7)
    return most_common, rank

@api_router.get("/leads")
async def get_leads(
    request: Request,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    pipelineStage: Optional[str] = None,
    assignedTo: Optional[str] = None,
    search: Optional[str] = None,
    source: Optional[str] = None,
    city: Optional[str] = None,
    portfolioSent: Optional[bool] = None,
    mostCommonResponse: Optional[str] = None,
    showDuplicatesOnly: Optional[bool] = False,
    sortField: Optional[str] = "categoryRank",
    sortDirection: Optional[int] = 1,
    sortField2: Optional[str] = None,
    sortDirection2: Optional[int] = 1,
    limit: int = 50,
    skip: int = 0
):
    user = await get_current_user(request)
    
    query = {}
    
    # Team members can only see their assigned leads
    if user["role"] == "team_member":
        query["assignedTo"] = user["id"]
    elif assignedTo:
        query["assignedTo"] = assignedTo
    
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if pipelineStage:
        query["pipelineStage"] = pipelineStage
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if portfolioSent is not None:
        query["portfolioSent"] = portfolioSent
    if mostCommonResponse:
        query["mostCommonResponse"] = mostCommonResponse
    if showDuplicatesOnly:
        query["isDuplicate"] = True
        query["duplicateDismissed"] = {"$ne": True}
    if source == "instagram":
        query["instagram"] = {"$exists": True, "$nin": [None, ""]}
    elif source == "whatsapp":
        query["$or"] = [
            {"whatsapp": {"$exists": True, "$nin": [None, ""]}},
            {"whatsapp2": {"$exists": True, "$nin": [None, ""]}}
        ]
    elif source:
        query["sourceSheet"] = {"$regex": source, "$options": "i"}
    
    if search:
        search_query = {"$or": [
            {"companyName": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"phone2": {"$regex": search, "$options": "i"}},
            {"instagram": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]}
        if query:
            query = {"$and": [query, search_query]}
        else:
            query = search_query
    
    # Build sort
    sort_list = []
    if sortField:
        sort_list.append((sortField, sortDirection))
    if sortField2:
        sort_list.append((sortField2, sortDirection2))
    if not sort_list:
        sort_list = [("categoryRank", 1), ("priorityRank", 1)]
    
    total = await db.leads.count_documents(query)
    leads = await db.leads.find(query).sort(sort_list).skip(skip).limit(limit).to_list(limit)
    
    return {
        "leads": [serialize_doc(lead) for lead in leads],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.get("/leads/count")
async def get_leads_count(request: Request):
    user = await get_current_user(request)
    
    base_query = {}
    if user["role"] == "team_member":
        base_query["assignedTo"] = user["id"]
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    
    counts = {
        "total": await db.leads.count_documents(base_query),
        "today": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": today.isoformat(), "$lt": tomorrow.isoformat()}}),
        "tomorrow": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": tomorrow.isoformat(), "$lt": (tomorrow + timedelta(days=1)).isoformat()}}),
        "thisWeek": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": today.isoformat(), "$lt": week_end.isoformat()}}),
        "meetingDone": await db.leads.count_documents({**base_query, "category": "Meeting Done"}),
        "interested": await db.leads.count_documents({**base_query, "category": "Interested"}),
        "callBack": await db.leads.count_documents({**base_query, "category": "Call Back"}),
        "busy": await db.leads.count_documents({**base_query, "category": "Busy"}),
        "noResponse": await db.leads.count_documents({**base_query, "category": "No Response"}),
        "foreign": await db.leads.count_documents({**base_query, "category": "Foreign"}),
        "futureProjection": await db.leads.count_documents({**base_query, "category": "Future Projection"}),
        "needsReview": await db.leads.count_documents({**base_query, "category": "Needs Review"}),
        "notInterested": await db.leads.count_documents({**base_query, "category": "Not Interested"}),
        "instagram": await db.leads.count_documents({**base_query, "instagram": {"$exists": True, "$nin": [None, ""]}}),
        "whatsapp": await db.leads.count_documents({**base_query, "$or": [{"whatsapp": {"$exists": True, "$nin": [None, ""]}}, {"whatsapp2": {"$exists": True, "$nin": [None, ""]}}]}),
        "duplicates": await db.leads.count_documents({**base_query, "isDuplicate": True, "duplicateDismissed": {"$ne": True}})
    }
    
    return counts

@api_router.get("/leads/cities")
async def get_cities(request: Request):
    """Get unique cities for filter dropdown"""
    await get_current_user(request)
    cities = await db.leads.distinct("city")
    return [c for c in cities if c]

@api_router.get("/leads/sources")
async def get_sources(request: Request):
    """Get unique sources for filter dropdown"""
    await get_current_user(request)
    sources = await db.leads.distinct("sourceSheet")
    return [s for s in sources if s]

@api_router.get("/leads/export")
async def export_leads(
    request: Request,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    assignedTo: Optional[str] = None,
    search: Optional[str] = None,
    city: Optional[str] = None
):
    """Export leads to CSV"""
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "team_member":
        query["assignedTo"] = user["id"]
    elif assignedTo:
        query["assignedTo"] = assignedTo
    
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [
            {"companyName": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    if leads:
        writer = csv.DictWriter(output, fieldnames=leads[0].keys())
        writer.writeheader()
        for lead in leads:
            # Flatten responseHistory
            if 'responseHistory' in lead:
                lead['responseHistory'] = str(lead['responseHistory'])
            writer.writerow(lead)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, request: Request):
    user = await get_current_user(request)
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check access
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return serialize_doc(lead)

@api_router.post("/leads")
async def create_lead(lead: LeadCreate, request: Request):
    await get_current_user(request)
    
    lead_data = lead.model_dump()
    lead_data = calculate_ranks(lead_data)
    lead_data["dateAdded"] = datetime.now(timezone.utc).isoformat()
    lead_data["responseHistory"] = []
    lead_data["callCount"] = 0
    lead_data["isDuplicate"] = False
    lead_data["duplicateDismissed"] = False
    lead_data["mostCommonResponse"] = None
    lead_data["mostCommonResponseRank"] = None
    
    # Check for duplicates
    await check_and_mark_duplicate(lead_data)
    
    result = await db.leads.insert_one(lead_data)
    lead_data["_id"] = result.inserted_id
    
    return serialize_doc(lead_data)

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_update: LeadUpdate, request: Request):
    user = await get_current_user(request)
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check access
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    update_data = calculate_ranks(update_data)
    
    # If category changed to Not Interested, set dateMarkedNotInterested
    if update_data.get("category") == "Not Interested" and lead.get("category") != "Not Interested":
        update_data["dateMarkedNotInterested"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_data})
    
    updated_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated_lead)

@api_router.patch("/leads/{lead_id}")
async def patch_lead(lead_id: str, updates: dict, request: Request):
    """Inline edit single field"""
    user = await get_current_user(request)
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Recalculate ranks if needed
    updates = calculate_ranks(updates)
    
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": updates})
    
    updated_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated_lead)

@api_router.post("/leads/{lead_id}/response")
async def add_response_history(lead_id: str, entry: ResponseHistoryEntry, request: Request):
    user = await get_current_user(request)
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    entry_data = entry.model_dump()
    entry_data["timestamp"] = datetime.now(timezone.utc).isoformat()
    entry_data["teamMember"] = user["id"]
    entry_data["teamMemberName"] = user.get("name", "Unknown")
    
    # Update response history and recalculate most common response
    response_history = lead.get("responseHistory", [])
    response_history.append(entry_data)
    
    most_common, rank = calculate_most_common_response(response_history)
    
    update_data = {
        "mostCommonResponse": most_common,
        "mostCommonResponseRank": rank,
        "lastContactDate": entry_data["timestamp"]
    }
    
    # Update category based on response
    response_to_category = {
        "Interested": "Interested",
        "Not Interested": "Not Interested",
        "Meeting Done": "Meeting Done",
        "Busy — Call Back Later": "Busy",
        "Call Again 1": "Call Back",
        "Call Again 2": "Call Back",
        "Call Again 3": "Call Back",
        "Not Answering / Voicemail": "No Response"
    }
    if entry_data["response"] in response_to_category:
        new_cat = response_to_category[entry_data["response"]]
        update_data["category"] = new_cat
        update_data["categoryRank"] = CATEGORY_RANK.get(new_cat, 99)
    
    # Update portfolio/pricelist/wa sent flags
    if entry_data.get("portfolioSent"):
        update_data["portfolioSent"] = True
    if entry_data.get("priceListSent"):
        update_data["priceListSent"] = True
    if entry_data.get("waSent"):
        update_data["waSent"] = True
    
    # Update next follow-up
    if entry_data.get("nextFollowupDate"):
        update_data["nextFollowupDate"] = entry_data["nextFollowupDate"]
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$push": {"responseHistory": entry_data},
            "$inc": {"callCount": 1},
            "$set": update_data
        }
    )
    
    updated_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated_lead)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request):
    await require_admin(request)
    
    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead deleted"}

@api_router.post("/leads/bulk")
async def bulk_action(action: BulkAction, request: Request):
    """Perform bulk actions on leads"""
    user = await get_current_user(request)
    
    if action.action == "delete":
        await require_admin(request)
        result = await db.leads.delete_many({
            "_id": {"$in": [ObjectId(id) for id in action.leadIds]}
        })
        return {"message": f"Deleted {result.deleted_count} leads"}
    
    elif action.action == "reassign":
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        await db.leads.update_many(
            {"_id": {"$in": [ObjectId(id) for id in action.leadIds]}},
            {"$set": {"assignedTo": action.value}}
        )
        return {"message": f"Reassigned {len(action.leadIds)} leads"}
    
    elif action.action == "update_category":
        update_data = {"category": action.value}
        update_data = calculate_ranks(update_data)
        await db.leads.update_many(
            {"_id": {"$in": [ObjectId(id) for id in action.leadIds]}},
            {"$set": update_data}
        )
        return {"message": f"Updated {len(action.leadIds)} leads"}
    
    elif action.action == "update_priority":
        update_data = {"priority": action.value}
        update_data = calculate_ranks(update_data)
        await db.leads.update_many(
            {"_id": {"$in": [ObjectId(id) for id in action.leadIds]}},
            {"$set": update_data}
        )
        return {"message": f"Updated {len(action.leadIds)} leads"}
    
    raise HTTPException(status_code=400, detail="Invalid action")

# ============== DUPLICATE DETECTION ==============

async def check_and_mark_duplicate(lead_data: dict, exclude_id: str = None) -> Optional[dict]:
    """Check if lead is duplicate and mark it"""
    query_conditions = []
    
    # Check phone numbers
    for field in ['phone', 'phone2', 'whatsapp']:
        if lead_data.get(field):
            cleaned = clean_phone(lead_data[field])
            if cleaned:
                query_conditions.append({"phone": {"$regex": cleaned}})
                query_conditions.append({"phone2": {"$regex": cleaned}})
                query_conditions.append({"whatsapp": {"$regex": cleaned}})
    
    # Check instagram
    if lead_data.get('instagram'):
        cleaned = clean_instagram(lead_data['instagram'])
        if cleaned:
            query_conditions.append({"instagram": {"$regex": f"^@?{cleaned}$", "$options": "i"}})
    
    # Check company name + city
    if lead_data.get('companyName') and lead_data.get('city'):
        company_clean = re.sub(r'\s+', '', lead_data['companyName'].lower())
        city_clean = re.sub(r'\s+', '', lead_data['city'].lower())
        query_conditions.append({
            "$and": [
                {"companyName": {"$regex": company_clean, "$options": "i"}},
                {"city": {"$regex": city_clean, "$options": "i"}}
            ]
        })
    
    if not query_conditions:
        return None
    
    query = {"$or": query_conditions}
    if exclude_id:
        query["_id"] = {"$ne": ObjectId(exclude_id)}
    
    existing = await db.leads.find_one(query)
    if existing:
        lead_data["isDuplicate"] = True
        lead_data["duplicateOf"] = str(existing["_id"])
        return serialize_doc(existing)
    
    return None

@api_router.post("/leads/detect-duplicates")
async def detect_duplicates(request: Request):
    """Detect and mark all duplicates in database"""
    await require_admin(request)
    
    # Reset all duplicate flags first
    await db.leads.update_many({}, {"$set": {"isDuplicate": False, "duplicateOf": None}})
    
    leads = await db.leads.find({}, {"_id": 1, "phone": 1, "phone2": 1, "whatsapp": 1, "instagram": 1, "companyName": 1, "city": 1}).to_list(None)
    
    phone_map = {}
    instagram_map = {}
    company_city_map = {}
    duplicates_found = 0
    
    for lead in leads:
        lead_id = str(lead["_id"])
        duplicate_of = None
        
        # Check phones
        for field in ['phone', 'phone2', 'whatsapp']:
            if lead.get(field):
                cleaned = clean_phone(lead[field])
                if cleaned:
                    if cleaned in phone_map:
                        duplicate_of = phone_map[cleaned]
                        break
                    phone_map[cleaned] = lead_id
        
        # Check instagram
        if not duplicate_of and lead.get('instagram'):
            cleaned = clean_instagram(lead['instagram'])
            if cleaned:
                if cleaned in instagram_map:
                    duplicate_of = instagram_map[cleaned]
                else:
                    instagram_map[cleaned] = lead_id
        
        # Check company+city
        if not duplicate_of and lead.get('companyName') and lead.get('city'):
            key = f"{re.sub(r's+', '', lead['companyName'].lower())}_{re.sub(r's+', '', lead['city'].lower())}"
            if key in company_city_map:
                duplicate_of = company_city_map[key]
            else:
                company_city_map[key] = lead_id
        
        if duplicate_of and duplicate_of != lead_id:
            await db.leads.update_one(
                {"_id": lead["_id"]},
                {"$set": {"isDuplicate": True, "duplicateOf": duplicate_of}}
            )
            duplicates_found += 1
    
    return {"message": f"Found and marked {duplicates_found} duplicates"}

@api_router.post("/leads/{lead_id}/dismiss-duplicate")
async def dismiss_duplicate(lead_id: str, request: Request):
    """Dismiss duplicate flag"""
    await get_current_user(request)
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"duplicateDismissed": True}}
    )
    return {"message": "Duplicate dismissed"}

@api_router.get("/leads/{lead_id}/duplicates")
async def get_lead_duplicates(lead_id: str, request: Request):
    """Get all duplicates of a lead"""
    await get_current_user(request)
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Find all leads with same duplicateOf or that are duplicateOf this lead
    duplicate_ids = [lead_id]
    if lead.get("duplicateOf"):
        duplicate_ids.append(lead["duplicateOf"])
    
    duplicates = await db.leads.find({
        "$or": [
            {"_id": {"$in": [ObjectId(id) for id in duplicate_ids]}},
            {"duplicateOf": {"$in": duplicate_ids}}
        ]
    }).to_list(None)
    
    return [serialize_doc(d) for d in duplicates]

# ============== IMPORT HELPERS ==============

def parse_lead_row(row, column_mapping, user_id: str, user_name: str) -> dict:
    """Parse a single DataFrame row into a lead data dict."""
    lead_data = {
        "dateAdded": datetime.now(timezone.utc).isoformat(),
        "responseHistory": [],
        "callCount": 0,
        "isDuplicate": False,
        "duplicateDismissed": False,
        "status": "active"
    }
    responses = []
    for orig_col, mapped_field in column_mapping.items():
        value = row.get(orig_col)
        if pd.isna(value):
            continue
        value = str(value).strip()
        if mapped_field == 'category':
            lead_data['category'] = fuzzy_category(value)
        elif mapped_field == 'priority':
            lead_data['priority'] = fuzzy_priority(value)
        elif mapped_field == 'pipelineStage':
            lead_data['pipelineStage'] = fuzzy_pipeline_stage(value)
        elif mapped_field in ['nextFollowupDate', 'lastContactDate']:
            lead_data[mapped_field] = parse_date(value)
        elif mapped_field in ['phone', 'phone2', 'whatsapp', 'whatsapp2']:
            lead_data[mapped_field] = clean_phone(value)
        elif mapped_field == 'instagram':
            lead_data[mapped_field] = clean_instagram(value) or value
        elif mapped_field in ['portfolioSent', 'priceListSent']:
            lead_data[mapped_field] = str(value).lower() in ['yes', 'true', '1', 'sent']
        elif mapped_field in ['response1', 'response2', 'response3']:
            if value:
                responses.append(value)
        else:
            lead_data[mapped_field] = value

    if 'category' not in lead_data or not lead_data['category']:
        lead_data['category'] = 'Needs Review'
    if 'priority' not in lead_data or not lead_data['priority']:
        lead_data['priority'] = 'Low'
    if 'pipelineStage' not in lead_data or not lead_data['pipelineStage']:
        lead_data['pipelineStage'] = 'New Contact'

    lead_data = calculate_ranks(lead_data)

    for resp in responses:
        lead_data['responseHistory'].append({
            "response": resp,
            "timestamp": lead_data['dateAdded'],
            "teamMember": user_id,
            "teamMemberName": user_name
        })
        lead_data['callCount'] += 1

    if lead_data['responseHistory']:
        most_common, rank = calculate_most_common_response(lead_data['responseHistory'])
        lead_data['mostCommonResponse'] = most_common
        lead_data['mostCommonResponseRank'] = rank

    return lead_data


def read_file_to_df(content: bytes, filename: str, nrows=None):
    """Read CSV/Excel content into a pandas DataFrame."""
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        return pd.read_excel(io.BytesIO(content), nrows=nrows)
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            return pd.read_csv(io.BytesIO(content), encoding=encoding, nrows=nrows)
        except Exception:
            continue
    raise HTTPException(status_code=400, detail="Failed to read file with any encoding")


def get_match_reason(lead_data: dict, existing: dict) -> str:
    """Determine why two leads are considered duplicates."""
    for field in ['phone', 'phone2', 'whatsapp']:
        if lead_data.get(field):
            cleaned = clean_phone(lead_data[field])
            if cleaned:
                for ef in ['phone', 'phone2', 'whatsapp']:
                    if existing.get(ef) and cleaned in clean_phone(str(existing.get(ef, ''))):
                        return f"{field} matches {ef}"
    if lead_data.get('instagram') and existing.get('instagram'):
        if clean_instagram(lead_data['instagram']) == clean_instagram(str(existing.get('instagram', ''))):
            return "instagram"
    if lead_data.get('companyName') and lead_data.get('city'):
        if existing.get('companyName') and existing.get('city'):
            c1 = re.sub(r'\s+', '', lead_data['companyName'].lower())
            c2 = re.sub(r'\s+', '', str(existing.get('companyName', '')).lower())
            ci1 = re.sub(r'\s+', '', lead_data['city'].lower())
            ci2 = re.sub(r'\s+', '', str(existing.get('city', '')).lower())
            if c1 == c2 and ci1 == ci2:
                return "companyName + city"
    return "unknown"


# ============== IMPORT ENDPOINTS ==============

@api_router.post("/leads/import/analyze")
async def analyze_import(request: Request, file: UploadFile = File(...)):
    """Parse file, detect duplicates, return non-duplicates and duplicate pairs."""
    user = await get_current_user(request)
    content = await file.read()

    try:
        df = read_file_to_df(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    column_mapping = {}
    for col in df.columns:
        mapped = map_column_name(str(col))
        if mapped:
            column_mapping[str(col)] = mapped

    non_duplicates = []
    duplicates = []
    errors = []

    for idx, row in df.iterrows():
        try:
            lead_data = parse_lead_row(row, column_mapping, user["id"], user.get("name", "Import"))

            if not lead_data.get('companyName'):
                errors.append({"row": idx + 2, "reason": "Missing company name"})
                continue

            existing = await check_and_mark_duplicate(lead_data)
            if existing:
                reason = get_match_reason(lead_data, existing)
                # Strip internal fields from incoming for frontend display
                incoming_clean = {k: v for k, v in lead_data.items() if k not in ['isDuplicate', 'duplicateOf', 'duplicateDismissed']}
                duplicates.append({
                    "rowIndex": idx + 2,
                    "incoming": incoming_clean,
                    "existing": existing,
                    "matchReason": reason
                })
            else:
                non_duplicates.append({
                    "rowIndex": idx + 2,
                    "data": lead_data
                })
        except Exception as e:
            errors.append({"row": idx + 2, "reason": str(e)})

    return {
        "nonDuplicates": non_duplicates,
        "duplicates": duplicates,
        "errors": errors[:50],
        "totalErrors": len(errors),
        "columnMapping": column_mapping
    }


class BatchImportRequest(BaseModel):
    leads: List[Dict[str, Any]]

@api_router.post("/leads/import/batch")
async def batch_import_leads(body: BatchImportRequest, request: Request):
    """Import a batch of pre-parsed non-duplicate leads."""
    await get_current_user(request)
    imported = 0
    errors = []

    for i, lead_data in enumerate(body.leads):
        try:
            # Remove any stale ObjectId-like fields
            lead_data.pop("id", None)
            lead_data.pop("_id", None)
            await db.leads.insert_one(lead_data)
            imported += 1
        except Exception as e:
            errors.append({"index": i, "reason": str(e)})

    return {"imported": imported, "errors": errors}


class DuplicateResolution(BaseModel):
    action: str  # skip, overwrite, import_anyway, merge
    incoming: Dict[str, Any]
    existingId: str

class ResolveRequest(BaseModel):
    resolutions: List[DuplicateResolution]

@api_router.post("/leads/import/resolve")
async def resolve_duplicates_import(body: ResolveRequest, request: Request):
    """Process user decisions for duplicate leads."""
    await get_current_user(request)
    skipped = 0
    overwritten = 0
    merged = 0
    imported_anyway = 0
    errors = []

    for res in body.resolutions:
        try:
            if res.action == "skip":
                skipped += 1
                continue

            elif res.action == "overwrite":
                update_data = {k: v for k, v in res.incoming.items() if v is not None}
                update_data.pop("id", None)
                update_data.pop("_id", None)
                update_data["isDuplicate"] = False
                update_data["duplicateOf"] = None
                await db.leads.replace_one(
                    {"_id": ObjectId(res.existingId)},
                    update_data
                )
                overwritten += 1

            elif res.action == "import_anyway":
                new_lead = dict(res.incoming)
                new_lead.pop("id", None)
                new_lead.pop("_id", None)
                new_lead["isDuplicate"] = True
                new_lead["duplicateOf"] = res.existingId
                await db.leads.insert_one(new_lead)
                imported_anyway += 1

            elif res.action == "merge":
                existing = await db.leads.find_one({"_id": ObjectId(res.existingId)})
                if not existing:
                    errors.append({"existingId": res.existingId, "reason": "Existing lead not found"})
                    continue

                merged_data = {}
                for key in existing:
                    if key == "_id":
                        continue
                    existing_val = existing.get(key)
                    incoming_val = res.incoming.get(key)
                    # For responseHistory, combine both
                    if key == "responseHistory":
                        existing_hist = existing_val if isinstance(existing_val, list) else []
                        incoming_hist = incoming_val if isinstance(incoming_val, list) else []
                        merged_data[key] = existing_hist + incoming_hist
                        continue
                    # For callCount, sum them
                    if key == "callCount":
                        merged_data[key] = (existing_val or 0) + (incoming_val or 0)
                        continue
                    # Prefer non-empty incoming value, else keep existing
                    if incoming_val and incoming_val != "" and incoming_val != "Needs Review":
                        merged_data[key] = incoming_val
                    elif existing_val:
                        merged_data[key] = existing_val
                    else:
                        merged_data[key] = incoming_val

                merged_data["isDuplicate"] = False
                merged_data["duplicateOf"] = None
                merged_data.pop("id", None)
                merged_data.pop("_id", None)

                # Recalculate most common response
                if merged_data.get("responseHistory"):
                    mc, rank = calculate_most_common_response(merged_data["responseHistory"])
                    merged_data["mostCommonResponse"] = mc
                    merged_data["mostCommonResponseRank"] = rank

                merged_data = calculate_ranks(merged_data)
                await db.leads.replace_one({"_id": ObjectId(res.existingId)}, merged_data)
                merged += 1

        except Exception as e:
            errors.append({"existingId": res.existingId, "reason": str(e)})

    return {
        "skipped": skipped,
        "overwritten": overwritten,
        "merged": merged,
        "importedAnyway": imported_anyway,
        "errors": errors
    }


# Keep legacy import endpoint for backward compat
@api_router.post("/leads/import")
async def import_leads(request: Request, file: UploadFile = File(...)):
    """Legacy import - auto-skips duplicates"""
    user = await get_current_user(request)
    content = await file.read()
    try:
        df = read_file_to_df(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    column_mapping = {}
    for col in df.columns:
        mapped = map_column_name(str(col))
        if mapped:
            column_mapping[str(col)] = mapped

    imported = 0
    duplicates_skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            lead_data = parse_lead_row(row, column_mapping, user["id"], user.get("name", "Import"))
            if not lead_data.get('companyName'):
                errors.append({"row": idx + 2, "reason": "Missing company name"})
                continue
            existing = await check_and_mark_duplicate(lead_data)
            if existing:
                duplicates_skipped += 1
                continue
            await db.leads.insert_one(lead_data)
            imported += 1
        except Exception as e:
            errors.append({"row": idx + 2, "reason": str(e)})

    return {
        "imported": imported,
        "duplicatesSkipped": duplicates_skipped,
        "errors": errors[:50],
        "totalErrors": len(errors),
        "columnMapping": column_mapping
    }

@api_router.post("/leads/import/preview")
async def preview_import(request: Request, file: UploadFile = File(...)):
    """Preview first 10 rows of import file"""
    await get_current_user(request)
    content = await file.read()

    try:
        df_preview = read_file_to_df(content, file.filename, nrows=10)
        full_df = read_file_to_df(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    column_mapping = {}
    unmapped = []
    for col in df_preview.columns:
        mapped = map_column_name(str(col))
        if mapped:
            column_mapping[str(col)] = mapped
        else:
            unmapped.append(str(col))

    return {
        "columns": list(df_preview.columns),
        "columnMapping": column_mapping,
        "unmappedColumns": unmapped,
        "preview": df_preview.fillna("").to_dict(orient="records"),
        "totalRows": len(full_df)
    }

# ============== DASHBOARD STATS ==============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    
    base_query = {}
    if user["role"] == "team_member":
        base_query["assignedTo"] = user["id"]
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    
    # Pipeline stages breakdown
    pipeline_stats = []
    for stage in PIPELINE_STAGES:
        count = await db.leads.count_documents({**base_query, "pipelineStage": stage})
        pipeline_stats.append({"stage": stage, "count": count})
    
    # Category breakdown
    category_stats = []
    for cat, rank in CATEGORY_RANK.items():
        count = await db.leads.count_documents({**base_query, "category": cat})
        category_stats.append({"category": cat, "count": count, "rank": rank})
    
    # Priority breakdown
    priority_stats = []
    for pri, rank in PRIORITY_RANK.items():
        count = await db.leads.count_documents({**base_query, "priority": pri})
        priority_stats.append({"priority": pri, "count": count, "rank": rank})
    
    stats = {
        "totalLeads": await db.leads.count_documents(base_query),
        "todayFollowups": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": today.isoformat(), "$lt": tomorrow.isoformat()}}),
        "tomorrowFollowups": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": tomorrow.isoformat(), "$lt": (tomorrow + timedelta(days=1)).isoformat()}}),
        "weekFollowups": await db.leads.count_documents({**base_query, "nextFollowupDate": {"$gte": today.isoformat(), "$lt": week_end.isoformat()}}),
        "interestedLeads": await db.leads.count_documents({**base_query, "category": "Interested"}),
        "meetingsDone": await db.leads.count_documents({**base_query, "category": "Meeting Done"}),
        "pipelineStats": pipeline_stats,
        "categoryStats": category_stats,
        "priorityStats": priority_stats,
        "teamMembers": await db.users.count_documents({}),
        "duplicates": await db.leads.count_documents({**base_query, "isDuplicate": True, "duplicateDismissed": {"$ne": True}})
    }
    
    return stats

@api_router.get("/responses")
async def get_response_options(request: Request):
    """Get all available response options"""
    await get_current_user(request)
    return ALL_RESPONSES

# ============== CALL LOG ROUTES ==============

class CallLogCreate(BaseModel):
    lead_id: str
    duration: int  # in seconds
    notes: Optional[str] = None
    outcome: Optional[str] = None  # e.g., "positive", "neutral", "negative"
    next_followup: Optional[str] = None


class CallLogUpdate(BaseModel):
    duration: Optional[int] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_followup: Optional[str] = None


@api_router.get("/call-logs/lead/{lead_id}")
async def get_lead_call_logs(
    lead_id: str,
    request: Request,
    limit: int = 50,
    skip: int = 0
):
    """Get all call logs for a specific lead"""
    user = await get_current_user(request)
    
    # Verify lead exists and user has access
    try:
        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_logs = await db.call_logs.find(
        {"lead_id": lead_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for log in call_logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if isinstance(log.get("created_at"), datetime):
            log["created_at"] = log["created_at"].isoformat()
    
    total = await db.call_logs.count_documents({"lead_id": lead_id})
    
    return {
        "call_logs": call_logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@api_router.get("/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str, request: Request):
    """Get a specific call log"""
    user = await get_current_user(request)
    
    try:
        call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid call log ID")
    
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Verify user has access to the lead
    lead = await db.leads.find_one({"_id": ObjectId(call_log["lead_id"])})
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_log["id"] = str(call_log["_id"])
    del call_log["_id"]
    if isinstance(call_log.get("created_at"), datetime):
        call_log["created_at"] = call_log["created_at"].isoformat()
    
    return call_log


@api_router.post("/call-logs")
async def create_call_log(call_log_data: CallLogCreate, request: Request):
    """Create a new call log for a lead"""
    user = await get_current_user(request)
    
    # Verify lead exists
    try:
        lead = await db.leads.find_one({"_id": ObjectId(call_log_data.lead_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify user has access
    if user["role"] == "team_member" and lead.get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    call_log_doc = {
        "lead_id": call_log_data.lead_id,
        "created_by": user["id"],
        "created_by_name": user.get("name", "Unknown"),
        "duration": call_log_data.duration,
        "notes": call_log_data.notes,
        "outcome": call_log_data.outcome,
        "next_followup": call_log_data.next_followup,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.call_logs.insert_one(call_log_doc)
    
    # Update lead's last contacted date
    await db.leads.update_one(
        {"_id": ObjectId(call_log_data.lead_id)},
        {"$set": {"lastContactDate": datetime.now(timezone.utc)}}
    )
    
    call_log_doc["id"] = str(result.inserted_id)
    call_log_doc["created_at"] = call_log_doc["created_at"].isoformat()
    
    return call_log_doc


@api_router.put("/call-logs/{call_log_id}")
async def update_call_log(
    call_log_id: str,
    call_log_data: CallLogUpdate,
    request: Request
):
    """Update a call log"""
    user = await get_current_user(request)
    
    try:
        call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid call log ID")
    
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Verify user has access
    if user["role"] == "team_member" and call_log.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot edit others' call logs")
    
    update_data = {k: v for k, v in call_log_data.dict().items() if v is not None}
    
    if update_data:
        await db.call_logs.update_one(
            {"_id": ObjectId(call_log_id)},
            {"$set": update_data}
        )
    
    updated = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    if isinstance(updated.get("created_at"), datetime):
        updated["created_at"] = updated["created_at"].isoformat()
    
    return updated


@api_router.delete("/call-logs/{call_log_id}")
async def delete_call_log(call_log_id: str, request: Request):
    """Delete a call log"""
    user = await get_current_user(request)
    
    try:
        call_log = await db.call_logs.find_one({"_id": ObjectId(call_log_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid call log ID")
    
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Only admins can delete others' call logs
    if user["role"] != "admin" and call_log.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete others' call logs")
    
    await db.call_logs.delete_one({"_id": ObjectId(call_log_id)})
    
    return {"message": "Call log deleted"}


@api_router.get("/call-logs/stats/user")
async def get_user_call_stats(request: Request, days: int = 7):
    """Get call statistics for the current user"""
    user = await get_current_user(request)
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    call_logs = await db.call_logs.find({
        "created_by": user["id"],
        "created_at": {"$gte": start_date}
    }).to_list(length=None)
    
    total_calls = len(call_logs)
    total_duration = sum(log.get("duration", 0) for log in call_logs)
    avg_duration = total_duration / total_calls if total_calls > 0 else 0
    
    outcomes = {}
    for log in call_logs:
        outcome = log.get("outcome", "unknown")
        outcomes[outcome] = outcomes.get(outcome, 0) + 1
    
    return {
        "total_calls": total_calls,
        "total_duration_seconds": total_duration,
        "average_duration_seconds": avg_duration,
        "outcomes": outcomes,
        "period_days": days
    }

# ============== STARTUP ==============

@app.on_event("startup")
async def startup_db():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("category")
    await db.leads.create_index("priority")
    await db.leads.create_index("pipelineStage")
    await db.leads.create_index("assignedTo")
    await db.leads.create_index("nextFollowupDate")
    await db.leads.create_index("city")
    await db.leads.create_index("phone")
    await db.leads.create_index("instagram")
    await db.leads.create_index("isDuplicate")
    await db.leads.create_index([("categoryRank", 1), ("priorityRank", 1)])
    await db.leads.create_index([("companyName", "text"), ("city", "text")])
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@wedus.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "color": "#E8536A",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    
    # Seed sample team members
    sample_team = [
        {"name": "Priya Sharma", "email": "priya@wedus.com", "color": "#3B82F6"},
        {"name": "Rahul Mehta", "email": "rahul@wedus.com", "color": "#10B981"},
        {"name": "Ananya Singh", "email": "ananya@wedus.com", "color": "#F59E0B"}
    ]
    
    for member in sample_team:
        existing = await db.users.find_one({"email": member["email"]})
        if not existing:
            await db.users.insert_one({
                "email": member["email"],
                "password_hash": hash_password("team123"),
                "name": member["name"],
                "role": "team_member",
                "color": member["color"],
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"Team member created: {member['email']}")
    
    # Write test credentials
    Path("/app/memory").mkdir(parents=True, exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Wed Us CRM Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Team Members\n")
        for member in sample_team:
            f.write(f"- Email: {member['email']}\n")
            f.write("- Password: team123\n")
            f.write("- Role: team_member\n\n")
    
    logger.info("Database initialized successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Wed Us CRM API", "version": "1.0.0"}

# Health check (no /api prefix — sits on app directly for Railway/infra probes)
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Include the router in the main app
app.include_router(api_router)

# CORS — allow frontend origin from env
_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = [_frontend_url]
if "http://localhost:3000" not in _allowed_origins:
    _allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            return ObjectId(v)
        raise TypeError(f"Invalid ObjectId: {v}")


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class LeadBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    source: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    pipeline_stage: Optional[str] = None
    assigned_to: Optional[str] = None
    value: Optional[float] = None
    last_contacted: Optional[datetime] = None


class Lead(LeadBase):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    pipeline_stage: Optional[str] = None
    assigned_to: Optional[str] = None
    value: Optional[float] = None
    last_contacted: Optional[datetime] = None


class CallLogBase(BaseModel):
    lead_id: str
    duration: int  # in seconds
    notes: Optional[str] = None
    outcome: Optional[str] = None  # e.g., "positive", "neutral", "negative"
    next_followup: Optional[datetime] = None


class CallLog(CallLogBase):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Optional[str] = None  # e.g., "admin", "user", "manager"
    is_active: bool = True


class User(UserBase):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    members: List[str] = []  # User IDs
    owner: str


class Team(TeamBase):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    user: User
    token: Token

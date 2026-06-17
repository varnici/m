"""User profile and authentication schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any


class UserCreate(BaseModel):
    """Schema for creating a user."""
    phone: str = Field(..., min_length=10)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    category: str = Field(default="personal", pattern=r"^(retail|nine_to_five|personal|distributor|manufactural|logistics|artisan|business_owner)$")
    
    # Business profile fields
    business_name: Optional[str] = None
    trading_name: Optional[str] = None
    business_category: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    tin: Optional[str] = None
    ownership_type: Optional[str] = None  # sole_proprietorship, partnership, corporation
    registration_status: Optional[str] = None  # registered, unregistered, pending
    location: Optional[Dict[str, Any]] = None
    profile_image_url: Optional[str] = None
    security_type: str = Field(default="pin", pattern=r"^(pin|pattern)$")


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    trading_name: Optional[str] = None
    business_category: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    profile_image_url: Optional[str] = None
    location: Optional[Dict[str, Any]] = None


class SecurityUpdate(BaseModel):
    """Schema for updating security credentials."""
    hashed_pin: Optional[str] = None
    hashed_pattern: Optional[str] = None
    security_type: Optional[str] = Field(None, pattern=r"^(pin|pattern)$")


class UserOut(BaseModel):
    """Response schema for user."""
    id: str
    phone: str
    email: Optional[str]
    full_name: Optional[str]
    category: str
    business_name: Optional[str]
    trading_name: Optional[str]
    business_category: Optional[str]
    bank_name: Optional[str]
    account_number: Optional[str]
    tin: Optional[str]
    ownership_type: Optional[str]
    registration_status: Optional[str]
    location: Optional[Dict[str, Any]]
    profile_image_url: Optional[str]
    trust_level: str
    created_at: datetime

    class Config:
        from_attributes = True

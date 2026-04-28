from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    email: EmailStr | None = None
    full_name: str | None = None
    category: str = Field(default="personal")


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    business_name: str | None = None
    trading_name: str | None = None
    business_category: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    tin: str | None = None
    profile_image_url: str | None = None
    settings: dict | None = None
    location: dict | None = None
    security_type: str | None = None


class SecurityUpdate(BaseModel):
    current_password: str | None = None # For high-security changes
    new_pin: str | None = Field(None, min_length=4, max_length=6)
    new_pattern: str | None = None
    security_type: str | None = None # pin | pattern


class UserOut(BaseModel):
    id: str
    phone: str
    email: EmailStr | None
    full_name: str | None
    category: str
    trust_level: str
    business_name: str | None = None
    trading_name: str | None = None
    business_category: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    tin: str | None = None
    profile_image_url: str | None = None
    settings: dict | None = {}
    location: dict | None = None
    security_type: str = "pin"

    class Config:
        from_attributes = True


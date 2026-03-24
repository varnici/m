from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    email: EmailStr | None = None
    full_name: str | None = None
    category: str = Field(default="personal")


class UserOut(BaseModel):
    id: str
    phone: str
    email: EmailStr | None
    full_name: str | None
    category: str
    trust_level: str

    class Config:
        from_attributes = True


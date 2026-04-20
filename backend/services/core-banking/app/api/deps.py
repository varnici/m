from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id, get_current_user_id_optional

# For compatibility with legacy code expecting get_current_active_user
def get_current_active_user(user_id: str = Depends(get_current_user_id)) -> type:
    """
    Mock user object for compatibility.
    """
    class UserStub:
        def __init__(self, id):
            self.id = id
            self.is_active = True
    return UserStub(user_id)

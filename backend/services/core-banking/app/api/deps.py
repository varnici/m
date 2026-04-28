from dataclasses import dataclass

from fastapi import Depends

from app.infrastructure.auth import get_current_user_id, get_current_user_id_optional
from app.infrastructure.database import get_db


@dataclass(frozen=True)
class ActiveUser:
    id: str
    is_active: bool = True


# For compatibility with legacy code expecting get_current_active_user
def get_current_active_user(user_id: str = Depends(get_current_user_id)) -> ActiveUser:
    return ActiveUser(id=user_id)

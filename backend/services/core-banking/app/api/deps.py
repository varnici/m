from dataclasses import dataclass

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.infrastructure.auth import get_current_user_id, get_current_user_id_optional
from app.infrastructure.database import get_db
from app.models.user import User


@dataclass(frozen=True)
class ActiveUser:
    id: str
    is_active: bool = True


# For compatibility with legacy code expecting get_current_active_user
def get_current_active_user(user_id: str = Depends(get_current_user_id)) -> ActiveUser:
    return ActiveUser(id=user_id)


def require_admin(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    user = db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id

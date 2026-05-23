from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.database import get_db
from app.models.user import User
from app.models.wallet import Wallet

security = HTTPBearer()
logger = logging.getLogger(__name__)


def _decode_user_id(token: str) -> str:
    if not settings.jwt_secret:
        logger.error("JWT secret is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured",
        )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require_sub": True, "require_exp": True},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    """
    Validates JWT token and returns the user ID.
    In dev mode, trusts X-User-Id header for easier integration without Supabase JWT secret.
    """
    try:
        user_id: Optional[str] = None
        
        if settings.env == "dev" and x_user_id:
            user_id = x_user_id
            logger.debug("Using user_id from X-User-Id header: %s", user_id)
        
        if not user_id:
            user_id = _decode_user_id(credentials.credentials)

        if not settings.auth_auto_sync_users:
            return user_id

        # Auto-sync user if they don't exist locally
        user = db.get(User, user_id)
        if not user:
            logger.info("User %s not found in local DB; syncing", user_id)
            try:
                user = User(
                    id=user_id,
                    phone=f"sync_{user_id[:8]}",  # Dummy unique phone
                    category="business_owner",
                )
                db.add(user)

                wallet = Wallet(user_id=user_id, balance_kobo=0)
                db.add(wallet)

                db.commit()
                logger.info("User %s synced successfully", user_id)
            except Exception as e:
                db.rollback()
                logger.exception("Failed to sync user %s: %s", user_id, str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Sync error: {str(e)}",
                )

        return user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected auth error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth error: {str(e)}",
        )


def get_current_user_id_optional(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[str]:
    """
    Optional version of get_current_user_id. Does not perform DB sync.
    """
    if settings.env == "dev" and x_user_id:
        return x_user_id

    if not credentials:
        return None

    try:
        return _decode_user_id(credentials.credentials)
    except HTTPException:
        return None

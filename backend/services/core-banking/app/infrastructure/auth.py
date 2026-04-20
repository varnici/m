from typing import Optional
from fastapi import Header, HTTPException, Depends

def get_current_user_id(x_user_id: str = Header(..., alias="X-User-Id")) -> str:
    """
    Extracts and ensures the current user ID exists in the local database.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header missing")
    
    # Auto-sync user if they don't exist locally
    from app.infrastructure.database import SessionLocal
    from app.models.user import User
    from app.models.wallet import Wallet
    
    with SessionLocal()() as db:
        user = db.get(User, x_user_id)
        if not user:
            print(f"[DEBUG] User {x_user_id} not found in local DB. Syncing...")
            # Create stub user to satisfy foreign key constraints
            user = User(
                id=x_user_id,
                phone=f"sync_{x_user_id[:8]}", # Dummy unique phone
                category="business_owner"
            )
            db.add(user)
            
            # Ensure they have a wallet too
            wallet = Wallet(user_id=x_user_id, balance_kobo=0)
            db.add(wallet)
            
            db.commit()
            print(f"[DEBUG] User {x_user_id} synced successfully.")
            
    return x_user_id

def get_current_user_id_optional(x_user_id: Optional[str] = Header(None, alias="X-User-Id")) -> Optional[str]:
    """
    Optional version of get_current_user_id.
    """
    return x_user_id

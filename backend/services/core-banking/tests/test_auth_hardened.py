import pytest
import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.infrastructure.auth import get_current_user_id
from app.core.config import settings
from app.infrastructure.database import Base, get_db
from app.models.user import User
from app.models.wallet import Wallet

# Setup minimal app for testing auth dependency
app = FastAPI()
settings.jwt_secret = "test-secret"
settings.auth_auto_sync_users = False

@app.get("/test-auth")
def read_auth(user_id: str = Depends(get_current_user_id)):
    return {"user_id": user_id}

@pytest.fixture
def db_session():
    db_file = "test_auth.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    # Drop and recreate to ensure clean state
    Base.metadata.drop_all(bind=engine)
    User.__table__.create(engine)
    Wallet.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    if os.path.exists("test_auth.db"):
        try:
            os.remove("test_auth.db")
        except PermissionError:
            pass

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_get_current_user_id_valid_token(client):
    # 1. Generate valid token
    payload = {
        "sub": "test-user-123",
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=10)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    # 2. Call endpoint
    response = client.get("/test-auth", headers={"Authorization": f"Bearer {token}"})
    
    # 3. Assert
    assert response.status_code == 200
    assert response.json()["user_id"] == "test-user-123"

def test_get_current_user_id_syncs_new_user(client, db_session):
    settings.auth_auto_sync_users = True
    user_id = "new-user-456"
    payload = {
        "sub": user_id,
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=10)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    # Ensure user doesn't exist
    assert db_session.get(User, user_id) is None
    
    response = client.get("/test-auth", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    
    # Verify user was created in DB
    user = db_session.get(User, user_id)
    assert user is not None
    assert user.id == user_id
    assert user.wallet is not None
    settings.auth_auto_sync_users = False

def test_get_current_user_id_invalid_token(client):
    response = client.get("/test-auth", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_get_current_user_id_rejects_missing_exp(client):
    payload = {"sub": "test-user-789"}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    response = client.get("/test-auth", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"

def test_get_current_user_id_missing_token(client):
    response = client.get("/test-auth")
    assert response.status_code == 403 # FastAPI default for missing security

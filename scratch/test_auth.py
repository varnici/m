import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend", "services", "core-banking"))

from app.infrastructure.auth import get_current_user_id
from app.core.config import settings
from fastapi import Header
from unittest.mock import MagicMock

def test_auth():
    print(f"Testing auth with env={settings.env}")
    # Mock dependencies
    mock_db = MagicMock()
    mock_creds = MagicMock()
    
    # Test dev bypass
    user_id = get_current_user_id(x_user_id="test-user", credentials=mock_creds, db=mock_db)
    print(f"Bypass result: {user_id}")
    assert user_id == "test-user"
    print("Test Passed!")

if __name__ == "__main__":
    try:
        test_auth()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()

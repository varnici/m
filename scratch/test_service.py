import sys
import os

# Add backend to path
sys.path.append(r"c:\Users\paulji peters\VentureRoot\backend\services\core-banking")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.analytics_service import AnalyticsService

# Database connection
SQLALCHEMY_DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_dashboard():
    db = SessionLocal()
    owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5'
    
    print(f"--- Testing AnalyticsService for owner {owner_id} ---")
    service = AnalyticsService(db, owner_id)
    
    try:
        print("Calling get_dashboard_summary...")
        summary = service.get_dashboard_summary()
        print("Success!")
        print(summary)
    except Exception as e:
        import traceback
        print(f"Failed: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    test_dashboard()

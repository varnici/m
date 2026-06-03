import sys
import os

# Add backend to path
sys.path.append(r"c:\Users\paulji peters\VentureRoot\backend\services\core-banking")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.inventory_service_v2 import InventoryService
from app.schemas.inventory_schemas import ProductCreate

# Database connection
SQLALCHEMY_DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_create_product():
    db = SessionLocal()
    owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5'
    
    print(f"--- Testing Product Creation for owner {owner_id} ---")
    service = InventoryService(db, owner_id)
    
    payload = ProductCreate(
        name="Test Product",
        sku="TEST-SKU-001",
        cost_price_kobo=1000,
        selling_price_kobo=2000,
        quantity_on_hand=10,
        unit_of_measure="pcs"
    )
    
    try:
        print("Calling create_product...")
        product = service.create_product(payload)
        # Handle async if it was async
        import inspect
        if inspect.iscoroutine(product):
            import asyncio
            product = asyncio.run(product)
            
        print(f"Success! Product ID: {product.id}")
    except Exception as e:
        import traceback
        print(f"Failed: {e}")
        print(traceback.format_exc())
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_product()

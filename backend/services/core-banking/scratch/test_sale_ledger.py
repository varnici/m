
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.sales_service import SalesService
from app.services.inventory_service_v2 import InventoryServiceV2

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_end_to_end_sale():
    db = SessionLocal()
    owner_id = "56dca529-8e72-4ddc-b006-bc8e934bc6b5"
    
    # 1. Get a product
    from sqlalchemy import text
    product = db.execute(text("SELECT id, name FROM products WHERE owner_id = :oid LIMIT 1"), {"oid": owner_id}).fetchone()
    if not product:
        print("No product found to test sale.")
        return
    
    product_id = product[0]
    product_name = product[1]
    print(f"Testing sale for product: {product_name} ({product_id})")
    
    # 2. Get a store
    store = db.execute(text("SELECT id FROM stores WHERE owner_id = :oid LIMIT 1"), {"oid": owner_id}).fetchone()
    if not store:
        print("No store found to test sale.")
        return
    store_id = store[0]
    
    # 3. Process a sale
    sales_service = SalesService(db, owner_id)
    result = await sales_service.process_sale(store_id, [
        {"product_id": product_id, "quantity": 2}
    ])
    
    print(f"Sale process result: {result}")
    
    if result["status"] == "success":
        # 4. Verify in ledger
        inventory_service = InventoryServiceV2(db, owner_id)
        ledger = inventory_service.get_ledger(limit=5)
        print(f"Newest ledger item: {ledger[0].product_name}, Qty: {ledger[0].quantity}")
        
        if ledger[0].product_name == product_name and ledger[0].quantity == 2:
            print("SUCCESS: Sale recorded and visible in ledger.")
        else:
            print("FAILURE: Sale not found or mismatch in ledger.")
    else:
        print(f"FAILURE: Sale processing failed: {result.get('reason')}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(test_end_to_end_sale())

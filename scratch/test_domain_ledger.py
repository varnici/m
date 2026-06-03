
import sys
import os
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Setup path to import app
sys.path.append(os.path.join(os.getcwd(), "app"))
sys.path.append(os.getcwd())

from app.core.config import sqlalchemy_url
from app.services.inventory_service_v2 import InventoryService
from app.schemas.inventory_schemas import StockMovementCreate
from app.domain.inventory.entities import InventoryMovementType

def test_ledger():
    engine = create_engine(sqlalchemy_url())
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    owner_id = "56dca529-8e72-4ddc-b006-bc8e934bc6b5"
    product_id = "e1c16b62-1554-4477-b905-19ba31d01460"
    store_id = "9a3dcd8a-f131-453a-aec5-560413038dff"
    
    service = InventoryService(db, owner_id)
    
    print(f"Recording movement for product {product_id} in store {store_id}...")
    
    payload = StockMovementCreate(
        product_id=product_id,
        from_store_id=store_id, # sale needs from_store_id
        movement_type="sale",
        quantity=1,
        notes="Domain shadow mode test sale"
    )
    
    import asyncio
    async def run():
        return await service.record_stock_movement(payload)
    
    try:
        movement = asyncio.run(run())
        print(f"Movement recorded: {movement.id}")
        
        # Verify ledger
        from app.models.inventory_domain import InventoryLedgerEntryModel
        ledger_count = db.query(InventoryLedgerEntryModel).count()
        print(f"Total ledger entries: {ledger_count}")
        
        # Verify outbox
        from app.models.inventory_domain import DomainOutboxMessageModel
        outbox_count = db.query(DomainOutboxMessageModel).count()
        print(f"Total outbox messages: {outbox_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_ledger()

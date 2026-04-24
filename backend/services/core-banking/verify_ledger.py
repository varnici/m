from app.infrastructure.database import db_session
from app.services.inventory_service_v2 import InventoryServiceV2
import logging

logging.basicConfig(level=logging.INFO)

def verify_ledger(user_id):
    with db_session() as session:
        service = InventoryServiceV2(session, user_id)
        print("Fetching Ledger...")
        try:
            ledger = service.get_ledger(limit=5)
            print(f"Ledger items found: {len(ledger)}")
            for entry in ledger:
                print(f"  - Product: {entry.product_name}, Revenue: {entry.revenue_kobo}, Profit: {entry.profit_kobo}")
        except Exception as e:
            print(f"Error fetching ledger: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    # Using the same test owner ID
    verify_ledger('56dca529-8e72-4ddc-b006-bc8e934bc6b5')

from app.infrastructure.database import db_session
from app.models.inventory import InventorySnapshot, Store, StockLevel
from app.models.user import User

def check_snapshots():
    with db_session() as session:
        users = session.query(User).all()
        for u in users:
            snapshots_count = session.query(InventorySnapshot).filter(InventorySnapshot.owner_id == u.id).count()
            stores_count = session.query(Store).filter(Store.owner_id == u.id).count()
            print(f"User {u.id}: {snapshots_count} snapshots, {stores_count} stores")
            
            if stores_count > 0:
                from app.models.inventory import StockLevel
                stock_count = session.query(StockLevel).filter(StockLevel.owner_id == u.id).count()
                print(f"  Stock Levels: {stock_count}")

if __name__ == "__main__":
    check_snapshots()

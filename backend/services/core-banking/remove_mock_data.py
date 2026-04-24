import os
from app.infrastructure.database import SessionLocal
from app.models.inventory import Product

def remove_mock():
    db = SessionLocal()
    try:
        deleted = db.query(Product).filter(Product.id.like('seed_%')).delete(synchronize_session=False)
        db.commit()
        print(f"Deleted {deleted} mock products!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    remove_mock()

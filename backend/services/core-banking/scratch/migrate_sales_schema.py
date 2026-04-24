
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import uuid

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_movements_to_transactions():
    db = SessionLocal()
    try:
        # 1. Get all sale movements that don't have a reference_type='sales_transaction'
        # or where reference_id doesn't exist in sales_transactions
        query = text("""
            SELECT sm.id, sm.product_id, sm.quantity, sm.from_store_id, sm.owner_id, p.selling_price_kobo
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            WHERE sm.movement_type = 'sale'
            AND (sm.reference_type IS NULL OR sm.reference_type != 'sales_transaction')
        """)
        movements = db.execute(query).fetchall()
        
        print(f"Found {len(movements)} sale movements to migrate.")
        
        for mov in movements:
            mov_id, prod_id, qty, store_id, owner_id, unit_price = mov
            
            # Create a new SalesTransaction
            tx_id = f"TX-{uuid.uuid4().hex[:8].upper()}"
            total_amount = qty * unit_price
            
            # Insert SalesTransaction
            db.execute(text("""
                INSERT INTO sales_transactions (id, owner_id, store_id, total_amount_kobo, payment_method, transaction_date, created_at)
                VALUES (:id, :owner_id, :store_id, :total_amount, 'cash', NOW(), NOW())
            """), {
                "id": tx_id,
                "owner_id": owner_id,
                "store_id": store_id,
                "total_amount": total_amount
            })
            
            # Insert SalesTransactionItem
            db.execute(text("""
                INSERT INTO sales_transaction_items (id, sale_id, product_id, quantity_sold, unit_price_kobo, line_total_kobo, created_at)
                VALUES (:id, :sale_id, :product_id, :qty, :unit_price, :line_total, NOW())
            """), {
                "id": f"ITEM-{uuid.uuid4().hex[:8].upper()}",
                "sale_id": tx_id,
                "product_id": prod_id,
                "qty": qty,
                "unit_price": unit_price,
                "line_total": total_amount
            })
            
            # Update StockMovement reference
            db.execute(text("""
                UPDATE stock_movements
                SET reference_id = :tx_id, reference_type = 'sales_transaction'
                WHERE id = :mov_id
            """), {
                "tx_id": tx_id,
                "mov_id": mov_id
            })
            
            print(f"Migrated movement {mov_id} to transaction {tx_id}")
            
        db.commit()
        print("Migration completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_movements_to_transactions()

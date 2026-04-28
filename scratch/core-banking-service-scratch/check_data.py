
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)

def check_data():
    with engine.connect() as conn:
        print("Distinct owner_id in products:")
        res = conn.execute(text("SELECT DISTINCT owner_id FROM products")).fetchall()
        for r in res:
            print(f"  - {r[0]}")

        print("\nDistinct owner_id in sales_transactions:")
        res = conn.execute(text("SELECT DISTINCT owner_id FROM sales_transactions")).fetchall()
        for r in res:
            print(f"  - {r[0]}")
        
        print("\nRow count in sales_transactions:")
        count = conn.execute(text("SELECT COUNT(*) FROM sales_transactions")).scalar()
        print(f"  - {count}")

        print("\nRow count in sales_transaction_items:")
        count = conn.execute(text("SELECT COUNT(*) FROM sales_transaction_items")).scalar()
        print(f"  - {count}")

        print("\nRow count in stock_movements:")
        count = conn.execute(text("SELECT COUNT(*) FROM stock_movements")).scalar()
        print(f"  - {count}")

        print("\nRow count in sales (legacy):")
        count = conn.execute(text("SELECT COUNT(*) FROM sales")).scalar()
        print(f"  - {count}")

        print("\nStock Movements Details:")
        res = conn.execute(text("SELECT id, product_id, movement_type, quantity, reference_id, reference_type FROM stock_movements")).fetchall()
        for r in res:
            print(f"  - {r}")

if __name__ == "__main__":
    check_data()

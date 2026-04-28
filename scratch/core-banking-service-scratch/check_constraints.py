
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)

def check_constraints():
    with engine.connect() as conn:
        print("Constraints on sales_transaction_items:")
        query = text("""
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_class t ON c.conrelid = t.oid 
            WHERE t.relname = 'sales_transaction_items'
        """)
        res = conn.execute(query).fetchall()
        for r in res:
            print(f"  - {r[0]}: {r[1]}")

if __name__ == "__main__":
    check_constraints()

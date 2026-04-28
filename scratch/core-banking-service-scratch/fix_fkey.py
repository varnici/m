
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)

def fix_constraint():
    with engine.connect() as conn:
        print("Fixing foreign key constraint for sales_transaction_items...")
        
        # 1. Drop the old constraint
        conn.execute(text("ALTER TABLE sales_transaction_items DROP CONSTRAINT IF EXISTS sales_transaction_items_sale_id_fkey"))
        
        # 2. Add the new correct constraint
        conn.execute(text("""
            ALTER TABLE sales_transaction_items 
            ADD CONSTRAINT sales_transaction_items_sale_id_fkey 
            FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) 
            ON DELETE CASCADE
        """))
        
        # 3. Also check if sales_transactions table exists (just in case)
        exists = conn.execute(text("SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sales_transactions')")).scalar()
        print(f"sales_transactions table exists: {exists}")
        
        conn.commit()
        print("Constraint fixed successfully.")

if __name__ == "__main__":
    fix_constraint()

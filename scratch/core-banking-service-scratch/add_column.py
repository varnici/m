
import psycopg2

def add_column():
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        # Check if column exists
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales_transactions' AND column_name='discount_amount_kobo';")
        if not cur.fetchone():
            cur.execute("ALTER TABLE sales_transactions ADD COLUMN discount_amount_kobo BIGINT DEFAULT 0;")
            conn.commit()
            print("Successfully added discount_amount_kobo column")
        else:
            print("Column already exists")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()

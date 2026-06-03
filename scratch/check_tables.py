import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Checking Table Existence ---")
    tables = [
        'inventory_snapshots',
        'stock_movements',
        'purchase_orders',
        'sales_transactions'
    ]
    
    for table in tables:
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)", (table,))
        exists = cur.fetchone()[0]
        print(f"Table {table}: {'EXISTS' if exists else 'MISSING'}")
            
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- List of Products ---")
    cur.execute("SELECT id, name, sku, is_active FROM products")
    products = cur.fetchall()
    for p in products:
        print(p)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    print("Successfully connected to database")
    cur = conn.cursor()
    
    print("\n--- Products ---")
    cur.execute("SELECT id, name, sku, cost_price_kobo FROM products")
    products = cur.fetchall()
    for p in products:
        print(p)
        
    print("\n--- Stock Levels ---")
    cur.execute("SELECT product_id, store_id, quantity_on_hand FROM stock_levels")
    stocks = cur.fetchall()
    for s in stocks:
        print(s)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

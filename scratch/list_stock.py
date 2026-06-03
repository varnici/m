import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- List of Stock Levels ---")
    cur.execute("SELECT sl.id, p.name, sl.quantity_on_hand, s.name FROM stock_levels sl JOIN products p ON sl.product_id = p.id JOIN stores s ON sl.store_id = s.id")
    levels = cur.fetchall()
    for l in levels:
        print(l)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

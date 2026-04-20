import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Checking SQL Functions ---")
    functions = [
        'total_inventory_value',
        'inventory_turnover',
        'best_selling_products',
        'dead_stock_detection'
    ]
    
    for func in functions:
        cur.execute("SELECT proname FROM pg_proc WHERE proname = %s", (func,))
        if cur.fetchone():
            print(f"Function {func}: EXISTS")
        else:
            print(f"Function {func}: MISSING")
            
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    # Get owner_id from products
    cur.execute("SELECT owner_id FROM products LIMIT 1")
    owner = cur.fetchone()
    print(f"Detected Owner ID: {owner[0] if owner else 'None'}")

    # Get function definition
    cur.execute("""
        SELECT pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'inventory_turnover';
    """)
    func_def = cur.fetchone()
    if func_def:
        print("\n--- inventory_turnover Function Definition ---")
        print(func_def[0])
    else:
        print("\nFunction 'inventory_turnover' not found.")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

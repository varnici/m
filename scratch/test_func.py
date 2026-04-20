import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5'
    print(f"\n--- Testing total_inventory_value for {owner_id} ---")
    cur.execute("SELECT total_inventory_value(%s)", (owner_id,))
    val = cur.fetchone()[0]
    print(f"Result: {val}")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

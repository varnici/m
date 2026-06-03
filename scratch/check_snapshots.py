import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- List of Inventory Snapshots ---")
    cur.execute("SELECT id, snapshot_date, total_inventory_value_kobo, total_quantity_on_hand FROM inventory_snapshots")
    snapshots = cur.fetchall()
    for s in snapshots:
        print(s)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

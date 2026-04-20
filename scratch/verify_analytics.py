import psycopg2
import sys

OWNER_ID = "56dca529-8e72-4ddc-b006-bc8e934bc6b5"

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print(f"--- Analytics Verification for Owner: {OWNER_ID} ---")
    
    # Check total value
    cur.execute("SELECT total_inventory_value(%s)", (OWNER_ID,))
    val = cur.fetchone()[0]
    print(f"Total Inventory Value: {val} Kobo")
    
    # Check turnover
    cur.execute("SELECT inventory_turnover(%s, 30)", (OWNER_ID,))
    turnover = cur.fetchone()[0]
    print(f"Inventory Turnover (30d): {turnover}")
    
    # Check COGS components
    cur.execute("""
        SELECT SUM(sm.quantity * p.cost_price_kobo)
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE p.owner_id = %s AND sm.movement_type = 'sale'
    """, (OWNER_ID,))
    cogs = cur.fetchone()[0]
    print(f"COGS (Sale Movements): {cogs} Kobo")
    
    # Check Snapshots
    cur.execute("SELECT snapshot_date, total_inventory_value_kobo FROM inventory_snapshots WHERE owner_id = %s", (OWNER_ID,))
    snapshots = cur.fetchall()
    print(f"Snapshots found: {len(snapshots)}")
    for s in snapshots:
        print(f"  - {s[0]}: {s[1]} Kobo")

    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

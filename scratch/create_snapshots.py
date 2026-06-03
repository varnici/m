import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Creating inventory_snapshots table ---")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS inventory_snapshots (
            id VARCHAR PRIMARY KEY,
            owner_id VARCHAR NOT NULL,
            store_id VARCHAR,
            snapshot_date DATE NOT NULL,
            total_inventory_value_kobo BIGINT NOT NULL,
            total_quantity_on_hand INTEGER NOT NULL,
            low_stock_items_count INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_owner_date ON inventory_snapshots(owner_id, snapshot_date);
    """)
    conn.commit()
    print("Table created successfully!")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

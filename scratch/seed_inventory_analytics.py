import psycopg2
from datetime import datetime, timedelta
import uuid
import sys

OWNER_ID = "56dca529-8e72-4ddc-b006-bc8e934bc6b5"
STORE_ID = "9a3dcd8a-f131-453a-aec5-560413038dff"

def seed_data():
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("1. Refreshing Collation Version...")
        try:
            cur.execute("ALTER DATABASE ventureroot REFRESH COLLATION VERSION;")
            print("Collation refreshed.")
        except Exception as e:
            print(f"Collation refresh failed (might be already up to date or permission issue): {e}")

        print("\n2. Seeding Inventory Snapshots...")
        # Clear existing snapshots for this owner to start fresh
        cur.execute("DELETE FROM inventory_snapshots WHERE owner_id = %s", (OWNER_ID,))
        
        # Today's Snapshot
        # Total Value: 10,098,400 Kobo, Total Quantity: 96
        today = datetime.now().date()
        cur.execute("""
            INSERT INTO inventory_snapshots (id, owner_id, store_id, snapshot_date, total_inventory_value_kobo, total_quantity_on_hand, low_stock_items_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), OWNER_ID, STORE_ID, today, 10098400, 96, 2))
        
        # 30 Days Ago Snapshot
        # Total Value: ~10M Kobo
        thirty_days_ago = today - timedelta(days=30)
        cur.execute("""
            INSERT INTO inventory_snapshots (id, owner_id, store_id, snapshot_date, total_inventory_value_kobo, total_quantity_on_hand, low_stock_items_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), OWNER_ID, STORE_ID, thirty_days_ago, 10000000, 90, 1))
        print("Snapshots seeded.")

        print("\n3. Seeding Sales Movements for Turnover...")
        # Get product IDs
        cur.execute("SELECT id FROM products WHERE owner_id = %s", (OWNER_ID,))
        products = [r[0] for r in cur.fetchall()]
        
        # Check stock_movements columns
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'stock_movements'")
        sm_cols = [r[0] for r in cur.fetchall()]
        
        if not products:
            print("No products found to seed movements for!")
        else:
            # Seed 5 sales for each product in the last week
            for p_id in products:
                # Build dynamic query
                cols = ["id", "product_id", "movement_type", "quantity", "reference_id", "notes", "created_at", "input_method", "owner_id"]
                vals = [str(uuid.uuid4()), p_id, 'sale', 5, f"SEED-SALE-{p_id[:4]}", "System Seeded Sale", datetime.now() - timedelta(days=5), 'manual', OWNER_ID]
                
                if "from_store_id" in sm_cols:
                    cols.append("from_store_id")
                    vals.append(STORE_ID)
                elif "store_id" in sm_cols:
                    cols.append("store_id")
                    vals.append(STORE_ID)
                
                query = f"INSERT INTO stock_movements ({', '.join(cols)}) VALUES ({', '.join(['%s']*len(vals))})"
                cur.execute(query, tuple(vals))
            print(f"Seeded sales movements for {len(products)} products.")

        print("\nSeed process completed successfully!")
        conn.close()
    except Exception as e:
        print(f"Seed Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed_data()

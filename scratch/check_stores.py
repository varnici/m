import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Stores Count ---")
    cur.execute("SELECT COUNT(*) FROM stores")
    count = cur.fetchone()[0]
    print(f"Total Stores: {count}")
    
    if count > 0:
        cur.execute("SELECT id, name, is_primary, owner_id FROM stores")
        rows = cur.fetchall()
        for r in rows:
            print(f"Store {r[0]}: {r[1]} (Primary: {r[2]}, Owner: {r[3]})")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Categories Count ---")
    cur.execute("SELECT COUNT(*) FROM categories")
    count = cur.fetchone()[0]
    print(f"Total Categories: {count}")
    
    if count > 0:
        cur.execute("SELECT owner_id, COUNT(*) FROM categories GROUP BY owner_id")
        rows = cur.fetchall()
        for r in rows:
            print(f"Owner {r[0]}: {r[1]} categories")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

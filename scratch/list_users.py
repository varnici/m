import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- List of Users ---")
    cur.execute("SELECT id, phone, category FROM users")
    users = cur.fetchall()
    for u in users:
        print(u)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

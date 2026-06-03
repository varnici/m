import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- Column Types for profiles ---")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'")
    cols = cur.fetchall()
    for c in cols:
        print(c)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

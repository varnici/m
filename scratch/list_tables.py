import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    print("\n--- All Tables and Schemas ---")
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name")
    tables = cur.fetchall()
    for t in tables:
        print(f"{t[0]}.{t[1]}")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

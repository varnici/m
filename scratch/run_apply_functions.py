import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    with open(r"c:\Users\paulji peters\VentureRoot\scratch\apply_functions.sql", "r") as f:
        sql = f.read()
        
    print("Applying SQL functions...")
    cur.execute(sql)
    conn.commit()
    print("Successfully applied SQL functions.")
    
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

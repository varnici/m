import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    # Get column names of users table
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
    cols = cur.fetchall()
    print("Columns in users table:")
    for col in cols:
        print(f"  {col[0]}: {col[1]}")
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

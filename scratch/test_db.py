import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    print("Successfully connected to database")
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print("Successfully executed query")
    conn.close()
except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)

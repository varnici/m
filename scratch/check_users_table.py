import psycopg2
import sys

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT schemaname, tablename, tableowner FROM pg_tables WHERE tablename = 'users'")
    res = cur.fetchall()
    print(f"Users table search results: {res}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

import psycopg2
import sys

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT typname FROM pg_type WHERE typname = 'store_type_enum'")
    res = cur.fetchall()
    print(f"store_type_enum exists: {len(res) > 0}")
    if res:
        print(f"Details: {res}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

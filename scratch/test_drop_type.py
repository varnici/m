import psycopg2
import sys

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    print("Dropping type store_type_enum...")
    cur.execute("DROP TYPE IF EXISTS store_type_enum CASCADE;")
    conn.commit()
    print("Dropped successfully!")
    cur.execute("SELECT typname FROM pg_type WHERE typname = 'store_type_enum'")
    res = cur.fetchall()
    print(f"Still exists: {len(res) > 0}")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")

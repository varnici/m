import psycopg2
try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
    print("Success")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

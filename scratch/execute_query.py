import psycopg2
import sys

def execute_query(conn_str):
    try:
        conn = psycopg2.connect(conn_str, connect_timeout=5)
        cur = conn.cursor()
        
        cur.execute("SELECT id, phone, email, full_name FROM users")
        rows = cur.fetchall()
        
        print(f"SUCCESS_COUNT:{len(rows)}")
        for r in rows:
            print(f"USER_ROW:{r[0]}|{r[1]}|{r[2]}|{r[3]}")
            
        conn.close()
        return True
    except Exception as e:
        print(f"FAILED:{e}")
        return False

# Try local first
print("Trying local database:")
if not execute_query("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"):
    sys.exit(1)

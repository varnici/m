import psycopg2
import sys

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

print(f"Connecting to database {db_url} for diagnostics...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    with open("migrations/008_mapvo_core_schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()
        
    escaped_sql = sql.replace("%", "%%")
    
    try:
        cur.execute(escaped_sql)
        conn.commit()
        print("Success!")
    except Exception as e:
        conn.rollback()
        print(f"\n--- DATABASE ERROR DIAGNOSTICS ---")
        print(f"Error class: {e.__class__.__name__}")
        print(f"Error message: {e}")
        if hasattr(e, 'diag'):
            diag = e.diag
            print(f"Severity: {diag.severity}")
            print(f"Primary message: {diag.message_primary}")
            print(f"Detail: {diag.message_detail}")
            print(f"Hint: {diag.message_hint}")
            print(f"Context: {diag.context}")
            print(f"Statement Position: {diag.statement_position}")
            if diag.statement_position:
                pos = int(diag.statement_position)
                # Since escaped_sql has %% replacing %, let's use the original sql to find the location
                start = max(0, pos - 150)
                end = min(len(escaped_sql), pos + 150)
                print(f"\n=== Fragment around position {pos} ===")
                print(escaped_sql[start:end])
                print("=======================================")

        sys.exit(1)
        
except Exception as e:
    print(f"Outer error: {e}")
    sys.exit(1)

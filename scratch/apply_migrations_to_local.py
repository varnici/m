import os
import sys
import psycopg2

# Local postgres URL
db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

print(f"Connecting to local database using raw psycopg2: {db_url}")

try:
    conn = psycopg2.connect(db_url, connect_timeout=5)
    cur = conn.cursor()
    print("Successfully connected to the local PostgreSQL database!")
    
    # Refresh collation if needed
    try:
        cur.execute("ALTER DATABASE ventureroot REFRESH COLLATION VERSION")
        conn.commit()
        print("Successfully refreshed collation version.")
    except Exception as e:
        conn.rollback()
        print(f"Warning (Collation refresh skipped): {e}")
        
    files = [
        "migrations/000_drop_all_tables.sql",
        "migrations/008_mapvo_core_schema.sql",
        "migrations/009_missing_budget_best_tables.sql",
        "migrations/010_seed_user_and_catalog.sql"
    ]
    
    for file_path in files:
        print(f"\n--- Executing {file_path} ---")
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
        
        try:
            cur.execute(sql_content)
            conn.commit()
            print(f"Successfully applied {file_path}")
        except Exception as exc:
            conn.rollback()
            err_msg = str(exc).encode('ascii', errors='ignore').decode('ascii')
            print(f"Failed to execute {file_path}: {err_msg}")
            sys.exit(1)
            
    print("\nAll migrations and seeds successfully applied to the local PostgreSQL database!")
    cur.close()
    conn.close()
    
except Exception as e:
    err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
    print(f"\nMigration failed: {err_msg}")
    sys.exit(1)

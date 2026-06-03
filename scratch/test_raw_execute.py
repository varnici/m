import psycopg2
import sys

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

try:
    print(f"Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Run drop tables first to be clean
    print("Dropping tables...")
    with open("migrations/000_drop_all_tables.sql", "r", encoding="utf-8") as f:
        drop_sql = f.read()
    cur.execute(drop_sql)
    conn.commit()
    print("Dropped successfully.")
    
    # Run mapvo core schema without any percent escaping!
    print("Executing core schema (raw)...")
    with open("migrations/008_mapvo_core_schema.sql", "r", encoding="utf-8") as f:
        schema_sql = f.read()
        
    cur.execute(schema_sql)
    conn.commit()
    print("Core schema executed successfully!")
    
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

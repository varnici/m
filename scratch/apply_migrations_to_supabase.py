import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load backend .env
load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in backend/.env")
    sys.exit(1)

print(f"Loaded DATABASE_URL from .env: {db_url.split('@')[1] if '@' in db_url else db_url}")

try:
    print("Creating SQLAlchemy engine...")
    engine = create_engine(db_url)
    
    files = [
        "migrations/000_drop_all_tables.sql",
        "migrations/008_mapvo_core_schema.sql",
        "migrations/009_missing_budget_best_tables.sql",
        "migrations/010_seed_user_and_catalog.sql"
    ]
    
    with engine.connect() as conn:
        print("Successfully connected to the remote database!")
        
        for file_path in files:
            print(f"\n--- Executing {file_path} ---")
            with open(file_path, "r", encoding="utf-8") as f:
                sql_content = f.read()
            
            # Split by semilcolon to run statements, or execute the block
            # Since execute can run multiple statements, we can run it directly,
            # but wrapping in a transaction is safer.
            trans = conn.begin()
            try:
                conn.execute(text(sql_content))
                trans.commit()
                print(f"Successfully applied {file_path}")
            except Exception as exc:
                trans.rollback()
                print(f"Failed to execute {file_path}: {exc}")
                raise exc
                
    print("\nAll migrations and seeds successfully applied to the remote Supabase database!")
    
except Exception as e:
    print(f"\nMigration failed: {e}")
    sys.exit(1)

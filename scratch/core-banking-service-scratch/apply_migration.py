
from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def apply_migration():
    engine = create_engine(DATABASE_URL)
    migration_path = r"c:\Users\paulji peters\VentureRoot\migrations\004_update_inventory_functions.sql"
    
    with open(migration_path, 'r') as f:
        sql = f.read()
    
    # Split by semicolon but be careful with DO blocks
    # Actually, let's just execute the whole thing if possible
    # Or at least the functions
    
    with engine.connect() as connection:
        # PostgreSQL can handle multiple statements in one execute call with psycopg2
        connection.execute(text(sql))
        connection.commit()
        print("Migration applied successfully.")

if __name__ == "__main__":
    apply_migration()

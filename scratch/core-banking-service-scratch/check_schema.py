
import asyncio
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def check_table_schema():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_snapshots' ORDER BY ordinal_position;"))
        columns = result.fetchall()
        for col in columns:
            print(f"Column: {col[0]}, Type: {col[1]}")

if __name__ == "__main__":
    check_table_schema()


from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def check_products_schema():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'owner_id';"))
        col = result.fetchone()
        if col:
            print(f"Column: {col[0]}, Type: {col[1]}")
        else:
            print("Column not found")

if __name__ == "__main__":
    check_products_schema()

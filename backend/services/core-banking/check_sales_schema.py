import os
import sys
from sqlalchemy import create_engine, text

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd()))

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def check_table(table_name):
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print(f"--- Table: {table_name} ---")
        result = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}' ORDER BY ordinal_position"))
        for row in result:
            print(f"Col: {row[0]}, Type: {row[1]}")

if __name__ == "__main__":
    check_table("sales_transaction_items")
    check_table("sales_transactions")

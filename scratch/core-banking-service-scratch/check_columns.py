
from sqlalchemy import create_engine, inspect
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

def check_columns(table_name):
    print(f"Columns for table '{table_name}':")
    columns = inspector.get_columns(table_name)
    for column in columns:
        print(f"  - {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_columns("sales_transaction_items")
    check_columns("sales_transactions")

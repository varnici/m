
from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def verify_data():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Check snapshot count
        result = connection.execute(text("SELECT COUNT(*) FROM inventory_snapshots;"))
        count = result.scalar()
        print(f"Total Snapshots: {count}")
        
        # Check some data
        result = connection.execute(text("SELECT snapshot_date, total_inventory_value_kobo, inventory_turnover_ratio FROM inventory_snapshots LIMIT 5;"))
        rows = result.fetchall()
        for row in rows:
            print(f"Date: {row[0]}, Value: {row[1]}, Turnover: {row[2]}")
            
        # Check global turnover via function
        # Get an owner_id first
        result = connection.execute(text("SELECT DISTINCT owner_id FROM inventory_snapshots LIMIT 1;"))
        owner_id = result.scalar()
        if owner_id:
            result = connection.execute(text("SELECT inventory_turnover(:owner_id, 30);"), {"owner_id": owner_id})
            turnover = result.scalar()
            print(f"Global Turnover for {owner_id}: {turnover}")

if __name__ == "__main__":
    verify_data()

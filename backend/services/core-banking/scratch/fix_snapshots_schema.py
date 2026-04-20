
from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def update_schema():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Check if columns exist first to be safe
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_snapshots';"))
        existing_columns = [row[0] for row in result.fetchall()]
        
        if 'out_of_stock_items_count' not in existing_columns:
            print("Adding column out_of_stock_items_count...")
            connection.execute(text("ALTER TABLE inventory_snapshots ADD COLUMN out_of_stock_items_count INTEGER DEFAULT 0;"))
        
        if 'inventory_turnover_ratio' not in existing_columns:
            print("Adding column inventory_turnover_ratio...")
            connection.execute(text("ALTER TABLE inventory_snapshots ADD COLUMN inventory_turnover_ratio FLOAT DEFAULT 0.0;"))
        
        connection.commit()
        print("Schema update complete.")

if __name__ == "__main__":
    update_schema()

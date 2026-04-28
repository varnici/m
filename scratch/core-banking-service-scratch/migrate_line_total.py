
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Adding line_total_kobo to sales_transaction_items...")
        conn.execute(text("ALTER TABLE sales_transaction_items ADD COLUMN IF NOT EXISTS line_total_kobo BIGINT"))
        print("Updating line_total_kobo values...")
        conn.execute(text("UPDATE sales_transaction_items SET line_total_kobo = quantity_sold * unit_price_kobo WHERE line_total_kobo IS NULL"))
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()

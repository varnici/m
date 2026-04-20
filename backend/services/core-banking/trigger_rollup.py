
from datetime import date, timedelta
from app.tasks.daily_inventory_rollup import calculate_daily_inventory_rollup
from app.infrastructure.database import db_session

if __name__ == "__main__":
    # Trigger rollup for the last 30 days to populate history
    today = date.today()
    for i in range(1, 31):
        target_date = today - timedelta(days=i)
        print(f"Triggering rollup for {target_date}...")
        calculate_daily_inventory_rollup(target_date)
    print("Done.")

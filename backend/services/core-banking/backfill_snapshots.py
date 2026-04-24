from datetime import date, timedelta
from app.tasks.daily_inventory_rollup import calculate_daily_inventory_rollup

def backfill_snapshots(days=30):
    print(f"Starting backfill for the last {days} days...")
    for i in range(days, -1, -1):
        target_date = date.today() - timedelta(days=i)
        print(f"Processing {target_date}...")
        try:
            calculate_daily_inventory_rollup(target_date)
        except Exception as e:
            print(f"Error processing {target_date}: {e}")
    print("Backfill completed.")

if __name__ == "__main__":
    backfill_snapshots(30)

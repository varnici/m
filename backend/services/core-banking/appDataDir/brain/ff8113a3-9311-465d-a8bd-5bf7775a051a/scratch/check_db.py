import sqlite3
import os

db_path = r"c:\Users\paulji peters\VentureRoot\backend\services\core-banking\core_banking.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, name, is_primary FROM stores;")
    stores = cursor.fetchall()
    print("STORES:")
    for s in stores:
        print(s)

    cursor.execute("SELECT id, name, sku FROM products LIMIT 5;")
    products = cursor.fetchall()
    print("\nPRODUCTS:")
    for p in products:
        print(p)

    cursor.execute("SELECT product_id, store_id, quantity_on_hand FROM stock_levels;")
    stock = cursor.fetchall()
    print("\nSTOCK LEVELS:")
    for s in stock:
        print(s)

except Exception as e:
    print(f"Error: {e}")

conn.close()

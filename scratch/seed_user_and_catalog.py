import os
import sys
import random
import psycopg2
from dotenv import load_dotenv

# Load environment configuration
load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in backend/.env")
    sys.exit(1)

if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

user_id = "56dca529-8e72-4ddc-b006-bc8e934bc6b5"

try:
    print(f"Connecting to database to seed user {user_id}...")
    conn = psycopg2.connect(db_url, connect_timeout=15)
    cur = conn.cursor()
    
    # 1. Check if user exists
    cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    user_exists = cur.fetchone()
    
    if not user_exists:
        print(f"Creating user {user_id}...")
        cur.execute("""
            INSERT INTO users (id, phone, email, full_name, category, trust_level, security_type)
            VALUES (%s, '+2348000000000', 'paulji@ventureroot.com', 'Paulji Peters', 'business_owner', 'bronze', 'pin')
        """, (user_id,))
        
        # Create default wallet
        print(f"Creating wallet for user {user_id}...")
        cur.execute("""
            INSERT INTO wallets (user_id, balance_kobo, total_debt_kobo)
            VALUES (%s, 5000000, 0)
        """, (user_id,))
    else:
        print(f"User {user_id} already exists.")
        
    # 2. Check if a store exists for this user
    cur.execute("SELECT id FROM stores WHERE owner_id = %s", (user_id,))
    store_exists = cur.fetchone()
    
    if not store_exists:
        print("Creating default store...")
        store_id = "seed_store_main"
        cur.execute("""
            INSERT INTO stores (id, owner_id, name, type, address, city, state, is_primary, status)
            VALUES (%s, %s, 'Main Store', 'retail', '123 Main Street', 'Lagos', 'Lagos', TRUE, 'active')
        """, (store_id, user_id))
    else:
        store_id = store_exists[0]
        print(f"Store {store_id} already exists.")
        
    # 3. Seed categories and products
    # We will seed some common Nigerian products from the retail_data template
    categories = [
        ("cat_food", "Food & Groceries", "food-groceries"),
        ("cat_beverages", "Beverages & Drinks", "beverages"),
        ("cat_bakery", "Bakery & Pastries", "bakery-pastries"),
        ("cat_health_beauty", "Health & Beauty", "health-beauty"),
        ("cat_home_cleaning", "Home & Cleaning", "home-cleaning")
    ]
    
    subcategories = [
        # (id, name, parent_id)
        ("sub_rice_pasta", "Rice, Pasta & Noodles", "cat_food"),
        ("sub_oil_spices", "Oils & Spices", "cat_food"),
        ("sub_water_juice", "Water & Juices", "cat_beverages"),
        ("sub_carbonated", "Carbonated Drinks", "cat_beverages"),
        ("sub_snacks_biscuits", "Snacks & Biscuits", "cat_bakery"),
        ("sub_skin_care", "Skin Care", "cat_health_beauty"),
        ("sub_laundry", "Laundry", "cat_home_cleaning")
    ]
    
    products = [
        # (id, category_id, name, cost_kobo, price_kobo)
        ("seed_p1", "sub_rice_pasta", "Mama Gold Rice 50kg", 7500000, 8500000),
        ("seed_p2", "sub_rice_pasta", "Indomie Super Pack (Chicken)", 25000, 30000),
        ("seed_p4", "sub_rice_pasta", "Golden Penny Spaghetti", 80000, 95000),
        ("seed_p6", "sub_oil_spices", "Kings Vegetable Oil 1L", 220000, 250000),
        ("seed_p8", "sub_oil_spices", "Knorr Chicken Cubes", 80000, 95000),
        ("seed_p15", "sub_water_juice", "Eva Table Water 75cl", 20000, 25000),
        ("seed_p17", "sub_water_juice", "Chivita 100% Fruit Juice", 120000, 140000),
        ("seed_p19", "sub_carbonated", "Coca-Cola 50cl PET", 25000, 30000),
        ("seed_p23", "sub_carbonated", "Maltina Classic", 30000, 35000),
        ("seed_p32", "sub_snacks_biscuits", "Digestive Biscuits", 50000, 60000),
        ("seed_p39", "sub_skin_care", "Dettol Antiseptic Soap", 35000, 45000),
        ("seed_p48", "sub_laundry", "Ariel Washing Powder", 150000, 180000)
    ]
    
    # Insert main categories
    for cat_id, cat_name, cat_slug in categories:
        cur.execute("SELECT id FROM categories WHERE id = %s", (cat_id,))
        if not cur.fetchone():
            print(f"Seeding main category {cat_name}...")
            cur.execute("""
                INSERT INTO categories (id, owner_id, name, slug, description, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """, (cat_id, user_id, cat_name, cat_slug, f"Local Market: {cat_name}"))
            
    # Insert subcategories
    for sub_id, sub_name, parent_id in subcategories:
        cur.execute("SELECT id FROM categories WHERE id = %s", (sub_id,))
        if not cur.fetchone():
            print(f"Seeding subcategory {sub_name}...")
            cur.execute("""
                INSERT INTO categories (id, owner_id, name, slug, parent_id, description, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
            """, (sub_id, user_id, sub_name, sub_id.replace("_", "-"), parent_id, f"Subcategory of {sub_name}"))
            
    # Insert products and their initial stock levels
    for prod_id, cat_id, prod_name, cost, price in products:
        cur.execute("SELECT id FROM products WHERE id = %s", (prod_id,))
        if not cur.fetchone():
            print(f"Seeding product {prod_name}...")
            sku = f"890{random.randint(10000000, 99999999)}"
            cur.execute("""
                INSERT INTO products (id, owner_id, category_id, name, sku, barcode, unit_of_measure, cost_price_kobo, selling_price_kobo, minimum_stock_level, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, 'pcs', %s, %s, 5, TRUE)
            """, (prod_id, user_id, cat_id, prod_name, sku, sku, cost, price))
            
            # Seed stock level for product
            qty = random.randint(15, 80)
            print(f"  Setting stock level to {qty} for {prod_name}...")
            cur.execute("""
                INSERT INTO stock_levels (product_id, store_id, quantity_on_hand, quantity_reserved, status)
                VALUES (%s, %s, %s, 0, 'in_stock')
            """, (prod_id, store_id, qty))
            
    conn.commit()
    print("\nSuccessfully seeded all user, store, category, product, and stock data!")
    conn.close()
    
except Exception as e:
    print(f"\nFailed to seed data: {e}")
    sys.exit(1)

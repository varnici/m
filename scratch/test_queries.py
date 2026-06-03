import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    cur = conn.cursor()
    
    owner_id = '56dca529-8e72-4ddc-b006-bc8e934bc6b5'
    
    print("\n--- Testing Queries ---")
    
    queries = [
        ("total_inventory_value", "SELECT total_inventory_value(%s)", (owner_id,)),
        ("inventory_turnover", "SELECT inventory_turnover(%s, 30)", (owner_id,)),
        ("best_selling_products", "SELECT * FROM best_selling_products(%s, 5)", (owner_id,)),
        ("dead_stock_count", "SELECT COUNT(*) FROM dead_stock_detection(%s, 90)", (owner_id,)),
        ("revenue", "SELECT COALESCE(SUM(total_amount_kobo), 0) FROM sales_transactions WHERE owner_id = %s", (owner_id,)),
        ("category_health", "SELECT * FROM categories WHERE owner_id = %s", (owner_id,))
    ]
    
    for name, q, params in queries:
        try:
            cur.execute(q, params)
            print(f"Query {name}: SUCCESS")
        except Exception as e:
            print(f"Query {name}: FAILED - {e}")
            conn.rollback()
            
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

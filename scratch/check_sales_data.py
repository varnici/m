import psycopg2
import sys

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot", connect_timeout=5)
    print("Successfully connected to database")
    cur = conn.cursor()
    
    print("\n--- Sales Transactions ---")
    cur.execute("SELECT id, customer_name, total_amount_kobo FROM sales_transactions")
    sales = cur.fetchall()
    for s in sales:
        print(s)
        
    print("\n--- Purchase Orders ---")
    cur.execute("SELECT id, po_number, status FROM purchase_orders")
    pos = cur.fetchall()
    for po in pos:
        print(po)
        
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

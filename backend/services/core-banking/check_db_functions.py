import psycopg2
from psycopg2 import sql

def check_functions():
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        # Check functions named inventory_turnover
        cur.execute("""
            SELECT n.nspname as schema,
                   p.proname as function_name,
                   pg_get_function_arguments(p.oid) as arguments,
                   pg_get_function_result(p.oid) as result_type
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'inventory_turnover'
               OR p.proname = 'best_selling_products'
               OR p.proname = 'margin_percentage'
               OR p.proname = 'profit_per_unit';
        """)
        
        rows = cur.fetchall()
        print("Functions found:")
        for row in rows:
            print(f"Schema: {row[0]}, Name: {row[1]}, Args: {row[2]}, Result: {row[3]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_functions()

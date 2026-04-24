import psycopg2

def dump_functions():
    functions = [
        'inventory_turnover',
        'best_selling_products',
        'total_inventory_value',
        'dead_stock_detection',
        'margin_percentage',
        'profit_per_unit',
        'stock_days_remaining',
        'restock_quantity_prediction'
    ]
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        with open('db_functions_dump.sql', 'w') as f:
            for func_name in functions:
                cur.execute("""
                    SELECT n.nspname as schema,
                           p.proname as function_name,
                           pg_get_function_arguments(p.oid) as arguments,
                           pg_get_functiondef(p.oid)
                    FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE p.proname = %s;
                """, (func_name,))
                
                rows = cur.fetchall()
                for row in rows:
                    f.write(f"-- Schema: {row[0]}, Name: {row[1]}, Args: {row[2]}\n")
                    f.write(row[3])
                    f.write("\n\n")
            
        cur.close()
        conn.close()
        print("Dumped to db_functions_dump.sql")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_functions()

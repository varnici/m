import psycopg2

def get_function_body(function_name):
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        cur.execute("""
            SELECT n.nspname as schema,
                   p.proname as function_name,
                   pg_get_function_arguments(p.oid) as arguments,
                   pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = %s;
        """, (function_name,))
        
        rows = cur.fetchall()
        for row in rows:
            print(f"--- Schema: {row[0]}, Name: {row[1]}, Args: {row[2]} ---")
            print(row[3])
            print("\n")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_function_body('total_inventory_value')

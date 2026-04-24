import psycopg2

def check_schema(table_name):
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))
        
        rows = cur.fetchall()
        print(f"--- Table: {table_name} ---")
        for row in rows:
            print(f"Col: {row[0]}, Type: {row[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema('inventory_snapshots')
    check_schema('products')

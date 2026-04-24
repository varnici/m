import psycopg2

def run_sql_file(file_path):
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        with open(file_path, 'r') as f:
            sql = f.read()
            cur.execute(sql)
            
        conn.commit()
        cur.close()
        conn.close()
        print(f"Successfully executed {file_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_sql_file('consolidate_functions.sql')

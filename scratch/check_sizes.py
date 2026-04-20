import psycopg2

try:
    conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            table_name, 
            (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name, 
            query_to_xml(format('SELECT COUNT(*) as cnt FROM %I', table_name), false, true, '') as xml_count
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        ) t
        ORDER BY row_count DESC;
    """)
    rows = cur.fetchall()
    for row in rows:
        print(f"{row[0]}: {row[1]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

import psycopg2
import sys
import re

db_url = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def split_statements(sql):
    statements = []
    current = []
    in_dollar = False
    
    lines = sql.split('\n')
    for line in lines:
        current.append(line)
        if '$$' in line:
            matches = re.findall(r'\$\$', line)
            if len(matches) % 2 != 0:
                in_dollar = not in_dollar
        
        stripped = line.strip()
        # End of statement when not in a dollar block and the line ends with a semicolon (ignoring comments)
        if not in_dollar and stripped.endswith(';'):
            statements.append('\n'.join(current))
            current = []
            
    if current:
        leftover = '\n'.join(current).strip()
        if leftover:
            statements.append(leftover)
            
    return statements

try:
    print(f"Connecting to database {db_url}...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    with open("migrations/008_mapvo_core_schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()
        
    statements = split_statements(sql)
    print(f"Found {len(statements)} statements to execute.")
    
    for i, stmt in enumerate(statements):
        stmt_strip = stmt.strip()
        if not stmt_strip:
            continue
            
        lines = stmt_strip.split('\n')
        preview = lines[0]
        if len(lines) > 1:
            preview += f" ... ({len(lines)} lines)"
            
        print(f"Executing statement {i+1}/{len(statements)}: {preview}")
        
        escaped_stmt = stmt_strip.replace("%", "%%")
        try:
            cur.execute(escaped_stmt)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"\n--- FAILED STATEMENT {i+1} ---")
            print(stmt_strip)
            print(f"-----------------------------")
            print(f"Error class: {e.__class__.__name__}")
            print(f"Error message: {e}")
            if hasattr(e, 'diag'):
                diag = e.diag
                print(f"Primary message: {diag.message_primary}")
                print(f"Hint: {diag.message_hint}")
            sys.exit(1)
            
    print("\nAll statements successfully executed!")
    
except Exception as e:
    print(f"Outer error: {e}")
    sys.exit(1)

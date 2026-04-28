
from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"

def check_functions():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT proname, proargtypes, proallargtypes, proargnames
            FROM pg_proc 
            JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
            WHERE n.nspname = 'public' AND proname = 'best_selling_products';
        """))
        funcs = result.fetchall()
        for f in funcs:
            print(f"Function: {f[0]}, Args: {f[3]}")

if __name__ == "__main__":
    check_functions()

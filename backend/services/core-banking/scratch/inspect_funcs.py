
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ventureroot:ventureroot@localhost:5432/ventureroot"
engine = create_engine(DATABASE_URL)

def inspect_functions():
    with engine.connect() as conn:
        funcs = ['best_selling_products', 'inventory_turnover', 'total_inventory_value']
        for func in funcs:
            print(f"--- Definition of {func} ---")
            res = conn.execute(text(f"SELECT prosrc FROM pg_proc WHERE proname = '{func}'")).scalar()
            print(res)
            print("-" * 30)

if __name__ == "__main__":
    inspect_functions()

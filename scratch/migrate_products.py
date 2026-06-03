import psycopg2

def migrate():
    try:
        conn = psycopg2.connect("postgresql://ventureroot:ventureroot@localhost:5432/ventureroot")
        cur = conn.cursor()
        
        print("Adding parent_id and conversion_factor columns to products table...")
        
        # 1. Add parent_id as VARCHAR to match existing ID types
        cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id CHARACTER VARYING REFERENCES products(id) ON DELETE SET NULL;")
        
        # 2. Add conversion_factor
        cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_factor INTEGER DEFAULT 1;")
        
        # 3. Create index for parent_id
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);")
        
        conn.commit()
        print("Migration successful!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

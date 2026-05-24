import os
import psycopg2
import sys
from dotenv import load_dotenv

# Load backend .env file
load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in backend/.env")
    sys.exit(1)

# If it starts with postgresql+psycopg2, change to postgresql
if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

try:
    print(f"Connecting to database: {db_url.split('@')[1] if '@' in db_url else db_url}")
    conn = psycopg2.connect(db_url, connect_timeout=10)
    cur = conn.cursor()
    
    print("\n--- All Tables ---")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    tables = cur.fetchall()
    if not tables:
        print("No public tables found!")
    else:
        for i, t in enumerate(tables, 1):
            print(f"{i}. {t[0]}")
            
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)

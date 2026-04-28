import sys
import os

# Add the parent directory to sys.path to allow importing 'app'
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.core.config import sqlalchemy_url

def migrate():
    url = sqlalchemy_url()
    engine = create_engine(url)
    with engine.connect() as conn:
        print("Migrating users table for security fields...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_pin VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_pattern VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_type VARCHAR DEFAULT 'pin';"))
            conn.commit()
            print("Migration successful!")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

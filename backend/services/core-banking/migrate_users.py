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
        print("Migrating users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSON;"))
            conn.commit()
            print("Migration successful!")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

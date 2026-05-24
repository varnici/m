import sys
import os

# Add backend/services/core-banking to path
sys.path.append(os.path.abspath("backend/services/core-banking"))

from app.core.config import sqlalchemy_url
from sqlalchemy import create_engine, inspect

url = sqlalchemy_url()
print(f"DATABASE URL returned by sqlalchemy_url(): {url}")

try:
    engine = create_engine(url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables accessible via engine: {tables}")
except Exception as e:
    print(f"Error: {e}")

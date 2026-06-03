import os
import sys
from pathlib import Path
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

# ---------------------------------------------------------------------------
# Exclude stale test_inventory.py — it imports the removed `inventory_service`
# module (superseded by inventory_service_v2). Port it before re-enabling.
# ---------------------------------------------------------------------------
collect_ignore_glob = ["test_inventory.py"]


# Ensure `import app...` works when running from repo root
SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

# Use sqlite in tests to avoid requiring Postgres
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

# Disable rate limiting during tests
from app.core.rate_limit import limiter
limiter.enabled = False

# Listen to connection connect events to configure SQLite for testing
@event.listens_for(Engine, "connect")
def configure_sqlite_connection(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
        # Register custom GeomFromEWKT function to bypass SpatiaLite requirements on SQLite
        dbapi_connection.create_function("GeomFromEWKT", 1, lambda val: val)
        dbapi_connection.create_function("AsEWKB", 1, lambda val: val)



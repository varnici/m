import os
import sys
from pathlib import Path


# Ensure `import app...` works when running from repo root
SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

# Use sqlite in tests to avoid requiring Postgres
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")


"""Central configuration for the Tahzeeb Sweets & Super Store POS backend.

Everything runs locally/offline. Values can be overridden with a .env file
placed next to run.py, but sensible local defaults are provided so the app
works out of the box.
"""
import os
from pathlib import Path

# Load .env if python-dotenv is available (optional)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:
    pass

# ---- PostgreSQL (local) -------------------------------------------------
DB_HOST = os.getenv("PGHOST", "localhost")
DB_PORT = int(os.getenv("PGPORT", "5432"))
DB_NAME = os.getenv("PGDATABASE", "tahzeeb_pos")
DB_USER = os.getenv("PGUSER", "postgres")
DB_PASSWORD = os.getenv("PGPASSWORD", "postgres")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

# ---- Auth ---------------------------------------------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "tahzeeb-sweets-super-store-local-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "720"))  # 30 days

# ---- Server -------------------------------------------------------------
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Default admin created on first run
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tahzeeb.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

APP_NAME = "Tahzeeb Sweets & Super Store - POS"

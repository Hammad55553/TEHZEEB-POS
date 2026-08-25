import sys
import psycopg2
from app.db import get_cursor

try:
    with get_cursor(commit=True) as cur:
        cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES inventory(id);")
        cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS pack_qty NUMERIC(12,2) DEFAULT 1;")
    print("Migration successful!")
except Exception as e:
    print(f"Error: {e}")

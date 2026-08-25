from app.db import get_cursor, init_pool
init_pool()
with get_cursor(commit=True) as cur:
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_name TEXT;")
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_id BIGINT;")
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;")
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;")
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS sales NUMERIC(12,2) DEFAULT 0;")
    cur.execute("ALTER TABLE shifts ADD COLUMN IF NOT EXISTS expenses NUMERIC(12,2) DEFAULT 0;")
print("Shifts table updated")

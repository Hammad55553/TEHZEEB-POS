from app.db import get_cursor, init_pool
init_pool()
with get_cursor(commit=True) as cur:
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12,2) DEFAULT 0;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS buy_price NUMERIC(12,2) DEFAULT 0;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12,2) DEFAULT 5;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry TEXT;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS critical_days INTEGER DEFAULT 60;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS manufacturer TEXT;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;")
    cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sell_type TEXT DEFAULT 'piece';")
print("Inventory table updated")

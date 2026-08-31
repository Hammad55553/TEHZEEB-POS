from backend.app.db import init_pool, get_cursor

init_pool()

with get_cursor(commit=True) as cur:
    try:
        cur.execute("ALTER TABLE shortage ADD COLUMN demand_count INT DEFAULT 1;")
        print("Added demand_count")
    except Exception as e:
        print("demand_count error:", e)
        
    try:
        cur.execute("ALTER TABLE shortage ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';")
        print("Added status")
    except Exception as e:
        print("status error:", e)
        
    try:
        cur.execute("ALTER TABLE shortage ADD COLUMN notes TEXT;")
        print("Added notes")
    except Exception as e:
        print("notes error:", e)

print("Done")

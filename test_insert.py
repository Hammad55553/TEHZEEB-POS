from backend.app.db import init_pool, get_cursor

init_pool()

with get_cursor(commit=True) as cur:
    try:
        cur.execute("INSERT INTO shortage (name, demand_count, status, notes) VALUES ('test', 1, 'Pending', 'note') RETURNING *")
        print(cur.fetchone())
    except Exception as e:
        print("ERROR:", e)

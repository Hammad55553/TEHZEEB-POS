from backend.app.db import init_pool, get_cursor

init_pool()

with get_cursor(commit=True) as cur:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'shortage';")
    print([r['column_name'] for r in cur.fetchall()])

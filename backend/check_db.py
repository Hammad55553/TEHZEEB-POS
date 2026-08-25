from app.db import get_cursor, init_pool
init_pool()
with get_cursor() as cur:
    cur.execute("SELECT id, name FROM inventory ORDER BY id DESC LIMIT 5")
    for row in cur.fetchall():
        print(dict(row))

import psycopg2
conn = psycopg2.connect("host=127.0.0.1 port=5432 user=postgres password=postgres dbname=postgres")
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute("SELECT datname FROM pg_database;")
    print([r[0] for r in cur.fetchall()])

"""PostgreSQL connection pool + schema bootstrap."""
from __future__ import annotations
from pathlib import Path
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor

from . import config

_pool: ThreadedConnectionPool | None = None


def _ensure_database_exists():
    """Create the target DB if it does not exist (connect to 'postgres')."""
    try:
        conn = psycopg2.connect(
            host=config.DB_HOST, port=config.DB_PORT,
            user=config.DB_USER, password=config.DB_PASSWORD,
            dbname="postgres",
        )
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (config.DB_NAME,))
            if not cur.fetchone():
                cur.execute(f'CREATE DATABASE "{config.DB_NAME}"')
        conn.close()
    except Exception as e:  # noqa
        print(f"[db] could not auto-create database ({e}); assuming it exists")


def init_pool():
    global _pool
    if _pool is not None:
        return
    _ensure_database_exists()
    _pool = ThreadedConnectionPool(
        minconn=1, maxconn=10, dsn=config.DATABASE_URL
    )
    _apply_schema()


def _apply_schema():
    schema_path = Path(__file__).resolve().parent.parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        conn.commit()


@contextmanager
def get_conn():
    assert _pool is not None, "pool not initialised"
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)


@contextmanager
def get_cursor(commit: bool = False):
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def close_pool():
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None


def ensure_sample_products():
    """Seed a few starter products (incl. Mix Mithai) only if inventory is empty.
    sell_type 'weight' = sold per kg (loose sweets); 'piece' = normal."""
    samples = [
        # name, category, sell_type, price(per kg or per pcs), stock, unit
        ("Mix Mithai", "Sweets", "weight", 1000, 20, "kg"),
        ("Barfi",      "Sweets", "weight", 1200, 25, "kg"),
        ("Gulab Jamun","Sweets", "weight", 900,  20, "kg"),
        ("Ladoo",      "Sweets", "weight", 850,  20, "kg"),
        ("Jalebi",     "Sweets", "weight", 700,  15, "kg"),
        ("Fresh Cream Cake (1kg)", "Bakery", "piece", 1500, 10, "pcs"),
        ("Coca Cola 1.5L", "Beverages", "piece", 180, 48, "pcs"),
    ]
    with get_cursor(commit=True) as cur:
        cur.execute("SELECT COUNT(*) AS c FROM inventory")
        row = cur.fetchone()
        count = row["c"] if isinstance(row, dict) else row[0]
        if count and count > 0:
            return
        for name, cat, st, price, stock, unit in samples:
            cur.execute(
                """INSERT INTO inventory
                   (name, category, sell_type, price, sale_price, wholesale_price, cost_price, buy_price,
                    stock, initial_stock, unit, low_stock, min_stock)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (name, cat, st, price, price, price, 0, 0, stock, stock, unit, 5, 5)
            )
        print(f"[db] seeded {len(samples)} sample products")
